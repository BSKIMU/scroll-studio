"""Validate the local MANO runtime and prepare data-only Previs hand references.

Run with CLUTCH's Python. Original model files stay untouched; generated model
data stays under ignored local/, never in the web distribution. Exports canonical
finger candidates for the local hand-fitting panel; does not replace character rigs.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
import smplx
import torch
from scipy.spatial.transform import Rotation
from smplx.vertex_ids import vertex_ids


def load_data(path):
    spec = importlib.util.spec_from_file_location(
        "clutch_data_setup", Path(__file__).with_name("setup-clutch-local.py"))
    safe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(safe)

    def array(value):
        if isinstance(value, safe.DataOnly):
            if hasattr(value, "x"):
                return array(value.x)
            if all(hasattr(value, key) for key in ("a", "idxs", "preferred_shape")):
                return array(value.a).reshape(-1)[value.idxs].reshape(value.preferred_shape)
            raise ValueError("Unsupported MANO data wrapper")
        return value.toarray() if hasattr(value, "toarray") else value

    with path.open("rb") as stream:
        data = safe.DataUnpickler(stream, encoding="latin1").load()
    return {key: array(value) for key, value in data.items()}


def prepare(source, output):
    torch.set_num_threads(2)
    reference, prior, checks = {}, {}, []
    candidates = dict(version=1, source="MANO v1.2", local_only=True, hands={})
    for side, word in (("L", "LEFT"), ("R", "RIGHT")):
        path = source / f"MANO_{word}.pkl"
        data = load_data(path)
        model = smplx.MANO("", is_rhand=side == "R", use_pca=False,
                           flat_hand_mean=True, data_struct=smplx.utils.Struct(**data))
        rows = np.asarray(data["hands_components"], dtype=np.float64)
        sigma = np.linalg.norm(rows, axis=1)
        mean = np.asarray(data["hands_mean"], dtype=np.float64)
        poses = mean + np.asarray(data["hands_coeffs"]) @ rows
        if not np.all(sigma > 0):
            raise ValueError("Degenerate MANO pose basis")
        with torch.inference_mode():
            flat = model(hand_pose=torch.zeros(1, 45))
            sample = model(hand_pose=torch.as_tensor(poses[:16], dtype=torch.float32),
                           betas=torch.zeros(16, 10), global_orient=torch.zeros(16, 3),
                           transl=torch.zeros(16, 3))
        assert flat.vertices.shape == (1, 778, 3)
        assert flat.joints.shape == (1, 16, 3)
        assert torch.isfinite(sample.vertices).all()
        delta = (sample.vertices - flat.vertices).abs().max().item()
        assert delta > .001, "Hand articulation did not change geometry"
        fields = dict(rest=(model.J_regressor @ model.v_template).detach().numpy(),
                      parents=model.parents.numpy(),
                      tips=np.stack([model.v_template[vertex_ids["mano"][name]].numpy()
                                     for name in ("index", "middle", "pinky", "ring", "thumb")]),
                      faces=model.faces, template=model.v_template.numpy(),
                      weights=model.lbs_weights.numpy(), posedirs=model.posedirs.numpy())
        reference.update({side + "_" + key: value for key, value in fields.items()})
        prior.update({side + "_components": (rows / sigma[:, None]).astype(np.float32),
                      side + "_sigma": sigma.astype(np.float32),
                      side + "_mean": mean.astype(np.float32),
                      side + "_poses": poses.astype(np.float32)})
        # Select a small, deterministic, diverse subset. No MANO model data is
        # copied into dist/: the local server serves these articulation samples.
        selected = [int(np.argmin(np.linalg.norm(poses - mean, axis=1)))]
        distance = np.full(len(poses), np.inf)
        for _ in range(95):
            distance = np.minimum(distance, np.sum((poses - poses[selected[-1]]) ** 2, axis=1))
            selected.append(int(np.argmax(distance)))
        rest = fields["rest"]
        normal = np.cross(rest[1] - rest[0], rest[7] - rest[0])
        normal /= np.linalg.norm(normal)
        if normal[2] < 0:
            normal = -normal
        rotations = Rotation.from_rotvec(poses[selected].reshape(-1, 3)).as_matrix().reshape(-1, 15, 3, 3)
        records = [{} for _ in selected]
        for f, name in enumerate(("Index", "Middle", "Pinky", "Ring", "Thumb")):
            for s in range(3):
                i = 1 + f * 3 + s
                direction = rest[i + 1] - rest[i] if s < 2 else rest[i] - rest[i - 1]
                direction /= np.linalg.norm(direction)
                palmar = normal - direction * np.dot(normal, direction)
                palmar /= np.linalg.norm(palmar)
                basis = np.stack((direction, palmar, np.cross(direction, palmar)), axis=1)
                quats = Rotation.from_matrix(basis.T @ rotations[:, i - 1] @ basis).as_quat()
                for record, quat in zip(records, quats):
                    record[name + str(s + 1)] = quat.round(7).tolist()
        candidates["hands"]["left" if side == "L" else "right"] = records
        checks.append(dict(side=side, vertices=778, joints=16, checked_poses=16,
                           source_poses=len(poses), max_pose_delta_m=round(delta, 6),
                           source_sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    assert all(np.isfinite(v).all() for v in [*reference.values(), *prior.values()])
    output.mkdir(parents=True, exist_ok=True)
    (output / "fit-candidates.json").write_text(json.dumps(candidates, separators=(",", ":")), encoding="utf-8")
    for name, arrays in (("mano-reference", reference), ("mano-pose-prior", prior)):
        np.savez_compressed(output / (name + ".npz"), **arrays)
        with np.load(output / (name + ".npz"), allow_pickle=False) as saved:
            assert all(np.array_equal(saved[key], value) for key, value in arrays.items())
    report = dict(runtime=str(Path(smplx.__file__).resolve()), model_source=str(source.resolve()),
                  official_code="https://github.com/vchoutas/smplx",
                  model_license="https://mano.is.tue.mpg.de/license.html",
                  local_only=True, fit_candidates_per_hand=96, checks=checks)
    (output / "validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("D:/_codex/CLUTCH/assets/mano_v1_2/mano"))
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parent.parent / "local/mano-runtime/models")
    args = parser.parse_args()
    prepare(args.source, args.output)
