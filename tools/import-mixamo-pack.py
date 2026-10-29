"""Safely keep a downloaded Mixamo ZIP and its FBXs in the personal library."""
import argparse, hashlib, json, shutil, stat, zipfile
from pathlib import Path, PurePosixPath

def import_pack(archive, destination, pack, genre, category):
    destination = destination.resolve()
    target = destination / genre / category / pack
    if not target.resolve().is_relative_to(destination):
        raise ValueError('Library path escaped its destination')
    with zipfile.ZipFile(archive) as source:
        members = source.infolist()
        if len(members) > 1000 or sum(m.file_size for m in members) > 1024**3:
            raise ValueError('Archive exceeds file count or size limit')
        files = []
        for member in members:
            path = PurePosixPath(member.filename.replace('\\', '/'))
            if path.is_absolute() or '..' in path.parts or any(':' in s for s in path.parts):
                raise ValueError('Unsafe ZIP member path')
            if stat.S_ISLNK(member.external_attr >> 16):
                raise ValueError('ZIP symlinks are not accepted')
            if member.is_dir() or path.suffix.lower() != '.fbx':
                continue
            if member.file_size > 40 * 1024**2:
                raise ValueError('FBX exceeds 40 MB')
            files.append((member, path))
        if not files:
            raise ValueError('Archive contains no FBX motions')
        target.mkdir(parents=True, exist_ok=True)
        rows, added, duplicates = [], 0, 0
        for member, path in files:
            data = source.read(member)  # ZIP CRC is checked here.
            if not (data.startswith(b'Kaydara FBX Binary') or b'FBX' in data[:256]):
                raise ValueError('Unexpected FBX header: ' + member.filename)
            digest = hashlib.sha256(data).hexdigest()
            output = target.joinpath(*path.parts)
            if not output.resolve().is_relative_to(target.resolve()):
                raise ValueError('Unsafe output path')
            output.parent.mkdir(parents=True, exist_ok=True)
            if output.exists():
                if hashlib.sha256(output.read_bytes()).hexdigest() == digest:
                    duplicates += 1
                else:
                    output = output.with_name(output.stem + '-' + digest[:10] + output.suffix)
            if not output.exists():
                with output.open('xb') as stream:
                    stream.write(data)
                added += 1
            rows.append(dict(file=output.relative_to(destination).as_posix(), name=path.stem,
                             sha256=digest, bytes=len(data), pack=pack, genre=genre,
                             subcategory=category, source='Mixamo', sourceUrl='https://www.mixamo.com/'))
    archives = destination / '_archives'
    archives.mkdir(exist_ok=True)
    kept = archives / archive.name
    if kept.exists() and hashlib.sha256(kept.read_bytes()).digest() != hashlib.sha256(archive.read_bytes()).digest():
        kept = archives / (archive.stem + '-' + hashlib.sha256(archive.read_bytes()).hexdigest()[:10] + archive.suffix)
    if not kept.exists():
        shutil.copy2(archive, kept)
    manifest = target / 'mixamo-pack.json'
    temp = manifest.with_suffix('.tmp')
    temp.write_text(json.dumps(dict(version=1, pack=pack, entries=rows), ensure_ascii=False, indent=2), 'utf-8')
    temp.replace(manifest)
    return dict(pack=pack, fbx=len(rows), added=added, duplicates=duplicates,
                bytes=sum(row['bytes'] for row in rows), folder=str(target), manifest=str(manifest))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--destination', type=Path, default=Path('D:/_codex/mixamo pose'))
    parser.add_argument('--pack', required=True)
    parser.add_argument('--genre', default='Combat')
    parser.add_argument('--category', required=True)
    args = parser.parse_args()
    print(json.dumps(import_pack(args.archive, args.destination, args.pack, args.genre, args.category), ensure_ascii=False))
