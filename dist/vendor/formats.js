var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/pako/lib/zlib/trees.js
var require_trees = __commonJS({
  "node_modules/pako/lib/zlib/trees.js"(exports, module) {
    "use strict";
    var Z_FIXED = 4;
    var Z_BINARY = 0;
    var Z_TEXT = 1;
    var Z_UNKNOWN = 2;
    function zero(buf) {
      let len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var Buf_size = 16;
    var MAX_BL_BITS = 7;
    var END_BLOCK = 256;
    var REP_3_6 = 16;
    var REPZ_3_10 = 17;
    var REPZ_11_138 = 18;
    var extra_lbits = (
      /* extra bits for each length code */
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
    );
    var extra_dbits = (
      /* extra bits for each distance code */
      new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
    );
    var extra_blbits = (
      /* extra bits for each bit length code */
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
    );
    var bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    var DIST_CODE_LEN = 512;
    var static_ltree = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    var static_dtree = new Array(D_CODES * 2);
    zero(static_dtree);
    var _dist_code = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    var base_length = new Array(LENGTH_CODES);
    zero(base_length);
    var base_dist = new Array(D_CODES);
    zero(base_dist);
    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
      this.static_tree = static_tree;
      this.extra_bits = extra_bits;
      this.extra_base = extra_base;
      this.elems = elems;
      this.max_length = max_length;
      this.has_stree = static_tree && static_tree.length;
    }
    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;
    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;
      this.max_code = 0;
      this.stat_desc = stat_desc;
    }
    var d_code = (dist) => {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    };
    var put_short = (s, w) => {
      s.pending_buf[s.pending++] = w & 255;
      s.pending_buf[s.pending++] = w >>> 8 & 255;
    };
    var send_bits = (s, value, length) => {
      if (s.bi_valid > Buf_size - length) {
        s.bi_buf |= value << s.bi_valid & 65535;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> Buf_size - s.bi_valid;
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= value << s.bi_valid & 65535;
        s.bi_valid += length;
      }
    };
    var send_code = (s, c, tree) => {
      send_bits(
        s,
        tree[c * 2],
        tree[c * 2 + 1]
        /*.Len*/
      );
    };
    var bi_reverse = (code, len) => {
      let res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    };
    var bi_flush = (s) => {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 255;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    };
    var gen_bitlen = (s, desc) => {
      const tree = desc.dyn_tree;
      const max_code = desc.max_code;
      const stree = desc.stat_desc.static_tree;
      const has_stree = desc.stat_desc.has_stree;
      const extra = desc.stat_desc.extra_bits;
      const base = desc.stat_desc.extra_base;
      const max_length = desc.stat_desc.max_length;
      let h;
      let n, m;
      let bits2;
      let xbits;
      let f;
      let overflow = 0;
      for (bits2 = 0; bits2 <= MAX_BITS; bits2++) {
        s.bl_count[bits2] = 0;
      }
      tree[s.heap[s.heap_max] * 2 + 1] = 0;
      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits2 = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits2 > max_length) {
          bits2 = max_length;
          overflow++;
        }
        tree[n * 2 + 1] = bits2;
        if (n > max_code) {
          continue;
        }
        s.bl_count[bits2]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits2 + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits2 = max_length - 1;
        while (s.bl_count[bits2] === 0) {
          bits2--;
        }
        s.bl_count[bits2]--;
        s.bl_count[bits2 + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits2 = max_length; bits2 !== 0; bits2--) {
        n = s.bl_count[bits2];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m * 2 + 1] !== bits2) {
            s.opt_len += (bits2 - tree[m * 2 + 1]) * tree[m * 2];
            tree[m * 2 + 1] = bits2;
          }
          n--;
        }
      }
    };
    var gen_codes = (tree, max_code, bl_count) => {
      const next_code = new Array(MAX_BITS + 1);
      let code = 0;
      let bits2;
      let n;
      for (bits2 = 1; bits2 <= MAX_BITS; bits2++) {
        code = code + bl_count[bits2 - 1] << 1;
        next_code[bits2] = code;
      }
      for (n = 0; n <= max_code; n++) {
        let len = tree[n * 2 + 1];
        if (len === 0) {
          continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
      }
    };
    var tr_static_init = () => {
      let n;
      let bits2;
      let length;
      let code;
      let dist;
      const bl_count = new Array(MAX_BITS + 1);
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < 1 << extra_lbits[code]; n++) {
          _length_code[length++] = code;
        }
      }
      _length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < 1 << extra_dbits[code]; n++) {
          _dist_code[dist++] = code;
        }
      }
      dist >>= 7;
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      for (bits2 = 0; bits2 <= MAX_BITS; bits2++) {
        bl_count[bits2] = 0;
      }
      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1, bl_count);
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
      }
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
    };
    var init_block = (s) => {
      let n;
      for (n = 0; n < L_CODES; n++) {
        s.dyn_ltree[n * 2] = 0;
      }
      for (n = 0; n < D_CODES; n++) {
        s.dyn_dtree[n * 2] = 0;
      }
      for (n = 0; n < BL_CODES; n++) {
        s.bl_tree[n * 2] = 0;
      }
      s.dyn_ltree[END_BLOCK * 2] = 1;
      s.opt_len = s.static_len = 0;
      s.sym_next = s.matches = 0;
    };
    var bi_windup = (s) => {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    };
    var smaller = (tree, n, m, depth) => {
      const _n2 = n * 2;
      const _m2 = m * 2;
      return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
    };
    var pqdownheap = (s, tree, k) => {
      const v = s.heap[k];
      let j = k << 1;
      while (j <= s.heap_len) {
        if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
          break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
      }
      s.heap[k] = v;
    };
    var compress_block = (s, ltree, dtree) => {
      let dist;
      let lc2;
      let sx = 0;
      let code;
      let extra;
      if (s.sym_next !== 0) {
        do {
          dist = s.pending_buf[s.sym_buf + sx++] & 255;
          dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
          lc2 = s.pending_buf[s.sym_buf + sx++];
          if (dist === 0) {
            send_code(s, lc2, ltree);
          } else {
            code = _length_code[lc2];
            send_code(s, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc2 -= base_length[code];
              send_bits(s, lc2, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);
            }
          }
        } while (sx < s.sym_next);
      }
      send_code(s, END_BLOCK, ltree);
    };
    var build_tree = (s, desc) => {
      const tree = desc.dyn_tree;
      const stree = desc.stat_desc.static_tree;
      const has_stree = desc.stat_desc.has_stree;
      const elems = desc.stat_desc.elems;
      let n, m;
      let max_code = -1;
      let node;
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;
      for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;
        } else {
          tree[n * 2 + 1] = 0;
        }
      }
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree) {
          s.static_len -= stree[node * 2 + 1];
        }
      }
      desc.max_code = max_code;
      for (n = s.heap_len >> 1; n >= 1; n--) {
        pqdownheap(s, tree, n);
      }
      node = elems;
      do {
        n = s.heap[
          1
          /*SMALLEST*/
        ];
        s.heap[
          1
          /*SMALLEST*/
        ] = s.heap[s.heap_len--];
        pqdownheap(
          s,
          tree,
          1
          /*SMALLEST*/
        );
        m = s.heap[
          1
          /*SMALLEST*/
        ];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[
          1
          /*SMALLEST*/
        ] = node++;
        pqdownheap(
          s,
          tree,
          1
          /*SMALLEST*/
        );
      } while (s.heap_len >= 2);
      s.heap[--s.heap_max] = s.heap[
        1
        /*SMALLEST*/
      ];
      gen_bitlen(s, desc);
      gen_codes(tree, max_code, s.bl_count);
    };
    var scan_tree = (s, tree, max_code) => {
      let n;
      let prevlen = -1;
      let curlen;
      let nextlen = tree[0 * 2 + 1];
      let count = 0;
      let max_count = 7;
      let min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] = 65535;
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          s.bl_tree[curlen * 2] += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            s.bl_tree[curlen * 2]++;
          }
          s.bl_tree[REP_3_6 * 2]++;
        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]++;
        } else {
          s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    };
    var send_tree = (s, tree, max_code) => {
      let n;
      let prevlen = -1;
      let curlen;
      let nextlen = tree[0 * 2 + 1];
      let count = 0;
      let max_count = 7;
      let min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            send_code(s, curlen, s.bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);
        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);
        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    };
    var build_bl_tree = (s) => {
      let max_blindex;
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
      build_tree(s, s.bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
          break;
        }
      }
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    };
    var send_all_trees = (s, lcodes, dcodes, blcodes) => {
      let rank;
      send_bits(s, lcodes - 257, 5);
      send_bits(s, dcodes - 1, 5);
      send_bits(s, blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
      }
      send_tree(s, s.dyn_ltree, lcodes - 1);
      send_tree(s, s.dyn_dtree, dcodes - 1);
    };
    var detect_data_type = (s) => {
      let block_mask = 4093624447;
      let n;
      for (n = 0; n <= 31; n++, block_mask >>>= 1) {
        if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
          return Z_BINARY;
        }
      }
      if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
          return Z_TEXT;
        }
      }
      return Z_BINARY;
    };
    var static_init_done = false;
    var _tr_init = (s) => {
      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }
      s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
      s.bi_buf = 0;
      s.bi_valid = 0;
      init_block(s);
    };
    var _tr_stored_block = (s, buf, stored_len, last) => {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
      bi_windup(s);
      put_short(s, stored_len);
      put_short(s, ~stored_len);
      if (stored_len) {
        s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
      }
      s.pending += stored_len;
    };
    var _tr_align = (s) => {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    };
    var _tr_flush_block = (s, buf, stored_len, last) => {
      let opt_lenb, static_lenb;
      let max_blindex = 0;
      if (s.level > 0) {
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = s.opt_len + 3 + 7 >>> 3;
        static_lenb = s.static_len + 3 + 7 >>> 3;
        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }
      } else {
        opt_lenb = static_lenb = stored_len + 5;
      }
      if (stored_len + 4 <= opt_lenb && buf !== -1) {
        _tr_stored_block(s, buf, stored_len, last);
      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      init_block(s);
      if (last) {
        bi_windup(s);
      }
    };
    var _tr_tally = (s, dist, lc2) => {
      s.pending_buf[s.sym_buf + s.sym_next++] = dist;
      s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
      s.pending_buf[s.sym_buf + s.sym_next++] = lc2;
      if (dist === 0) {
        s.dyn_ltree[lc2 * 2]++;
      } else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc2] + LITERALS + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
      }
      return s.sym_next === s.sym_end;
    };
    module.exports._tr_init = _tr_init;
    module.exports._tr_stored_block = _tr_stored_block;
    module.exports._tr_flush_block = _tr_flush_block;
    module.exports._tr_tally = _tr_tally;
    module.exports._tr_align = _tr_align;
  }
});

// node_modules/pako/lib/zlib/adler32.js
var require_adler32 = __commonJS({
  "node_modules/pako/lib/zlib/adler32.js"(exports, module) {
    "use strict";
    var adler32 = (adler, buf, len, pos) => {
      let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
      while (len !== 0) {
        n = len > 2e3 ? 2e3 : len;
        len -= n;
        do {
          s1 = s1 + buf[pos++] | 0;
          s2 = s2 + s1 | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
      }
      return s1 | s2 << 16 | 0;
    };
    module.exports = adler32;
  }
});

// node_modules/pako/lib/zlib/crc32.js
var require_crc32 = __commonJS({
  "node_modules/pako/lib/zlib/crc32.js"(exports, module) {
    "use strict";
    var makeTable = () => {
      let c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    };
    var crcTable = new Uint32Array(makeTable());
    var crc32 = (crc2, buf, len, pos) => {
      const t = crcTable;
      const end = pos + len;
      crc2 ^= -1;
      for (let i2 = pos; i2 < end; i2++) {
        crc2 = crc2 >>> 8 ^ t[(crc2 ^ buf[i2]) & 255];
      }
      return crc2 ^ -1;
    };
    module.exports = crc32;
  }
});

// node_modules/pako/lib/zlib/messages.js
var require_messages = __commonJS({
  "node_modules/pako/lib/zlib/messages.js"(exports, module) {
    "use strict";
    module.exports = {
      2: "need dictionary",
      /* Z_NEED_DICT       2  */
      1: "stream end",
      /* Z_STREAM_END      1  */
      0: "",
      /* Z_OK              0  */
      "-1": "file error",
      /* Z_ERRNO         (-1) */
      "-2": "stream error",
      /* Z_STREAM_ERROR  (-2) */
      "-3": "data error",
      /* Z_DATA_ERROR    (-3) */
      "-4": "insufficient memory",
      /* Z_MEM_ERROR     (-4) */
      "-5": "buffer error",
      /* Z_BUF_ERROR     (-5) */
      "-6": "incompatible version"
      /* Z_VERSION_ERROR (-6) */
    };
  }
});

// node_modules/pako/lib/zlib/constants.js
var require_constants = __commonJS({
  "node_modules/pako/lib/zlib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      /* Allowed flush values; see deflate() and inflate() below for details */
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      /* Return codes for the compression/decompression functions. Negative values
      * are errors, positive values are used for special but normal events.
      */
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_MEM_ERROR: -4,
      Z_BUF_ERROR: -5,
      //Z_VERSION_ERROR: -6,
      /* compression levels */
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      /* Possible values of the data_type field (though see inflate()) */
      Z_BINARY: 0,
      Z_TEXT: 1,
      //Z_ASCII:                1, // = Z_TEXT (deprecated)
      Z_UNKNOWN: 2,
      /* The deflate compression method */
      Z_DEFLATED: 8
      //Z_NULL:                 null // Use -1 or null inline, depending on var type
    };
  }
});

// node_modules/pako/lib/zlib/deflate.js
var require_deflate = __commonJS({
  "node_modules/pako/lib/zlib/deflate.js"(exports, module) {
    "use strict";
    var { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = require_trees();
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var msg = require_messages();
    var {
      Z_NO_FLUSH,
      Z_PARTIAL_FLUSH,
      Z_FULL_FLUSH,
      Z_FINISH,
      Z_BLOCK,
      Z_OK,
      Z_STREAM_END,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_BUF_ERROR,
      Z_DEFAULT_COMPRESSION,
      Z_FILTERED,
      Z_HUFFMAN_ONLY,
      Z_RLE,
      Z_FIXED,
      Z_DEFAULT_STRATEGY,
      Z_UNKNOWN,
      Z_DEFLATED
    } = require_constants();
    var MAX_MEM_LEVEL = 9;
    var MAX_WBITS = 15;
    var DEF_MEM_LEVEL = 8;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
    var PRESET_DICT = 32;
    var INIT_STATE = 42;
    var GZIP_STATE = 57;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;
    var BS_NEED_MORE = 1;
    var BS_BLOCK_DONE = 2;
    var BS_FINISH_STARTED = 3;
    var BS_FINISH_DONE = 4;
    var OS_CODE = 3;
    var err2 = (strm, errorCode) => {
      strm.msg = msg[errorCode];
      return errorCode;
    };
    var rank = (f) => {
      return f * 2 - (f > 4 ? 9 : 0);
    };
    var zero = (buf) => {
      let len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    };
    var slide_hash = (s) => {
      let n, m;
      let p;
      let wsize = s.w_size;
      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = m >= wsize ? m - wsize : 0;
      } while (--n);
      n = wsize;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = m >= wsize ? m - wsize : 0;
      } while (--n);
    };
    var HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
    var HASH = HASH_ZLIB;
    var flush_pending = (strm) => {
      const s = strm.state;
      let len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }
      strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    };
    var flush_block_only = (s, last) => {
      _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    };
    var put_byte = (s, b) => {
      s.pending_buf[s.pending++] = b;
    };
    var putShortMSB = (s, b) => {
      s.pending_buf[s.pending++] = b >>> 8 & 255;
      s.pending_buf[s.pending++] = b & 255;
    };
    var read_buf = (strm, buf, start, size) => {
      let len = strm.avail_in;
      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }
      strm.avail_in -= len;
      buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }
      strm.next_in += len;
      strm.total_in += len;
      return len;
    };
    var longest_match = (s, cur_match) => {
      let chain_length = s.max_chain_length;
      let scan = s.strstart;
      let match;
      let len;
      let best_len = s.prev_length;
      let nice_match = s.nice_match;
      const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
      const _win = s.window;
      const wmask = s.w_mask;
      const prev = s.prev;
      const strend = s.strstart + MAX_MATCH;
      let scan_end1 = _win[scan + best_len - 1];
      let scan_end = _win[scan + best_len];
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
      }
      do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
          continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    };
    var fill_window = (s) => {
      const _w_size = s.w_size;
      let n, more, str;
      do {
        more = s.window_size - s.lookahead - s.strstart;
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
          s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          s.block_start -= _w_size;
          if (s.insert > s.strstart) {
            s.insert = s.strstart;
          }
          slide_hash(s);
          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;
        if (s.lookahead + s.insert >= MIN_MATCH) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];
          s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
          while (s.insert) {
            s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH) {
              break;
            }
          }
        }
      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
    };
    var deflate_stored = (s, flush) => {
      let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
      let len, left, have, last = 0;
      let used = s.strm.avail_in;
      do {
        len = 65535;
        have = s.bi_valid + 42 >> 3;
        if (s.strm.avail_out < have) {
          break;
        }
        have = s.strm.avail_out - have;
        left = s.strstart - s.block_start;
        if (len > left + s.strm.avail_in) {
          len = left + s.strm.avail_in;
        }
        if (len > have) {
          len = have;
        }
        if (len < min_block && (len === 0 && flush !== Z_FINISH || flush === Z_NO_FLUSH || len !== left + s.strm.avail_in)) {
          break;
        }
        last = flush === Z_FINISH && len === left + s.strm.avail_in ? 1 : 0;
        _tr_stored_block(s, 0, 0, last);
        s.pending_buf[s.pending - 4] = len;
        s.pending_buf[s.pending - 3] = len >> 8;
        s.pending_buf[s.pending - 2] = ~len;
        s.pending_buf[s.pending - 1] = ~len >> 8;
        flush_pending(s.strm);
        if (left) {
          if (left > len) {
            left = len;
          }
          s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
          s.strm.next_out += left;
          s.strm.avail_out -= left;
          s.strm.total_out += left;
          s.block_start += left;
          len -= left;
        }
        if (len) {
          read_buf(s.strm, s.strm.output, s.strm.next_out, len);
          s.strm.next_out += len;
          s.strm.avail_out -= len;
          s.strm.total_out += len;
        }
      } while (last === 0);
      used -= s.strm.avail_in;
      if (used) {
        if (used >= s.w_size) {
          s.matches = 2;
          s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
          s.strstart = s.w_size;
          s.insert = s.strstart;
        } else {
          if (s.window_size - s.strstart <= used) {
            s.strstart -= s.w_size;
            s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
            if (s.matches < 2) {
              s.matches++;
            }
            if (s.insert > s.strstart) {
              s.insert = s.strstart;
            }
          }
          s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
          s.strstart += used;
          s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
        }
        s.block_start = s.strstart;
      }
      if (s.high_water < s.strstart) {
        s.high_water = s.strstart;
      }
      if (last) {
        return BS_FINISH_DONE;
      }
      if (flush !== Z_NO_FLUSH && flush !== Z_FINISH && s.strm.avail_in === 0 && s.strstart === s.block_start) {
        return BS_BLOCK_DONE;
      }
      have = s.window_size - s.strstart;
      if (s.strm.avail_in > have && s.block_start >= s.w_size) {
        s.block_start -= s.w_size;
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) {
          s.matches++;
        }
        have += s.w_size;
        if (s.insert > s.strstart) {
          s.insert = s.strstart;
        }
      }
      if (have > s.strm.avail_in) {
        have = s.strm.avail_in;
      }
      if (have) {
        read_buf(s.strm, s.window, s.strstart, have);
        s.strstart += have;
        s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
      }
      if (s.high_water < s.strstart) {
        s.high_water = s.strstart;
      }
      have = s.bi_valid + 42 >> 3;
      have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
      min_block = have > s.w_size ? s.w_size : have;
      left = s.strstart - s.block_start;
      if (left >= min_block || (left || flush === Z_FINISH) && flush !== Z_NO_FLUSH && s.strm.avail_in === 0 && left <= have) {
        len = left > have ? have : left;
        last = flush === Z_FINISH && s.strm.avail_in === 0 && len === left ? 1 : 0;
        _tr_stored_block(s, s.block_start, len, last);
        s.block_start += len;
        flush_pending(s.strm);
      }
      return last ? BS_FINISH_STARTED : BS_NEED_MORE;
    };
    var deflate_fast = (s, flush) => {
      let hash_head;
      let bflush;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
            s.match_length--;
            do {
              s.strstart++;
              s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            } while (--s.match_length !== 0);
            s.strstart++;
          } else {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
          }
        } else {
          bflush = _tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_slow = (s, flush) => {
      let hash_head;
      let bflush;
      let max_insert;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
          if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
            s.match_length = MIN_MATCH - 1;
          }
        }
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH;
          bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH - 1;
          s.strstart++;
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
          }
        } else if (s.match_available) {
          bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
          if (bflush) {
            flush_block_only(s, false);
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      if (s.match_available) {
        bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_rle = (s, flush) => {
      let bflush;
      let prev;
      let scan, strend;
      const _win = s.window;
      for (; ; ) {
        if (s.lookahead <= MAX_MATCH) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH;
            do {
            } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
            s.match_length = MAX_MATCH - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          bflush = _tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_huff = (s, flush) => {
      let bflush;
      for (; ; ) {
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;
          }
        }
        s.match_length = 0;
        bflush = _tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }
    var configuration_table = [
      /*      good lazy nice chain */
      new Config(0, 0, 0, 0, deflate_stored),
      /* 0 store only */
      new Config(4, 4, 8, 4, deflate_fast),
      /* 1 max speed, no lazy matches */
      new Config(4, 5, 16, 8, deflate_fast),
      /* 2 */
      new Config(4, 6, 32, 32, deflate_fast),
      /* 3 */
      new Config(4, 4, 16, 16, deflate_slow),
      /* 4 lazy matches */
      new Config(8, 16, 32, 32, deflate_slow),
      /* 5 */
      new Config(8, 16, 128, 128, deflate_slow),
      /* 6 */
      new Config(8, 32, 128, 256, deflate_slow),
      /* 7 */
      new Config(32, 128, 258, 1024, deflate_slow),
      /* 8 */
      new Config(32, 258, 258, 4096, deflate_slow)
      /* 9 max compression */
    ];
    var lm_init = (s) => {
      s.window_size = 2 * s.w_size;
      zero(s.head);
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;
      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      s.ins_h = 0;
    };
    function DeflateState() {
      this.strm = null;
      this.status = 0;
      this.pending_buf = null;
      this.pending_buf_size = 0;
      this.pending_out = 0;
      this.pending = 0;
      this.wrap = 0;
      this.gzhead = null;
      this.gzindex = 0;
      this.method = Z_DEFLATED;
      this.last_flush = -1;
      this.w_size = 0;
      this.w_bits = 0;
      this.w_mask = 0;
      this.window = null;
      this.window_size = 0;
      this.prev = null;
      this.head = null;
      this.ins_h = 0;
      this.hash_size = 0;
      this.hash_bits = 0;
      this.hash_mask = 0;
      this.hash_shift = 0;
      this.block_start = 0;
      this.match_length = 0;
      this.prev_match = 0;
      this.match_available = 0;
      this.strstart = 0;
      this.match_start = 0;
      this.lookahead = 0;
      this.prev_length = 0;
      this.max_chain_length = 0;
      this.max_lazy_match = 0;
      this.level = 0;
      this.strategy = 0;
      this.good_match = 0;
      this.nice_match = 0;
      this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
      this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
      this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);
      this.l_desc = null;
      this.d_desc = null;
      this.bl_desc = null;
      this.bl_count = new Uint16Array(MAX_BITS + 1);
      this.heap = new Uint16Array(2 * L_CODES + 1);
      zero(this.heap);
      this.heap_len = 0;
      this.heap_max = 0;
      this.depth = new Uint16Array(2 * L_CODES + 1);
      zero(this.depth);
      this.sym_buf = 0;
      this.lit_bufsize = 0;
      this.sym_next = 0;
      this.sym_end = 0;
      this.opt_len = 0;
      this.static_len = 0;
      this.matches = 0;
      this.insert = 0;
      this.bi_buf = 0;
      this.bi_valid = 0;
    }
    var deflateStateCheck = (strm) => {
      if (!strm) {
        return 1;
      }
      const s = strm.state;
      if (!s || s.strm !== strm || s.status !== INIT_STATE && //#ifdef GZIP
      s.status !== GZIP_STATE && //#endif
      s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) {
        return 1;
      }
      return 0;
    };
    var deflateResetKeep = (strm) => {
      if (deflateStateCheck(strm)) {
        return err2(strm, Z_STREAM_ERROR);
      }
      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN;
      const s = strm.state;
      s.pending = 0;
      s.pending_out = 0;
      if (s.wrap < 0) {
        s.wrap = -s.wrap;
      }
      s.status = //#ifdef GZIP
      s.wrap === 2 ? GZIP_STATE : (
        //#endif
        s.wrap ? INIT_STATE : BUSY_STATE
      );
      strm.adler = s.wrap === 2 ? 0 : 1;
      s.last_flush = -2;
      _tr_init(s);
      return Z_OK;
    };
    var deflateReset = (strm) => {
      const ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    };
    var deflateSetHeader = (strm, head) => {
      if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
        return Z_STREAM_ERROR;
      }
      strm.state.gzhead = head;
      return Z_OK;
    };
    var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      let wrap = 1;
      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
      }
      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED || windowBits === 8 && wrap !== 1) {
        return err2(strm, Z_STREAM_ERROR);
      }
      if (windowBits === 8) {
        windowBits = 9;
      }
      const s = new DeflateState();
      strm.state = s;
      s.strm = strm;
      s.status = INIT_STATE;
      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;
      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
      s.window = new Uint8Array(s.w_size * 2);
      s.head = new Uint16Array(s.hash_size);
      s.prev = new Uint16Array(s.w_size);
      s.lit_bufsize = 1 << memLevel + 6;
      s.pending_buf_size = s.lit_bufsize * 4;
      s.pending_buf = new Uint8Array(s.pending_buf_size);
      s.sym_buf = s.lit_bufsize;
      s.sym_end = (s.lit_bufsize - 1) * 3;
      s.level = level;
      s.strategy = strategy;
      s.method = method;
      return deflateReset(strm);
    };
    var deflateInit = (strm, level) => {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    };
    var deflate = (strm, flush) => {
      if (deflateStateCheck(strm) || flush > Z_BLOCK || flush < 0) {
        return strm ? err2(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }
      const s = strm.state;
      if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== Z_FINISH) {
        return err2(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }
      const old_flush = s.last_flush;
      s.last_flush = flush;
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
        return err2(strm, Z_BUF_ERROR);
      }
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err2(strm, Z_BUF_ERROR);
      }
      if (s.status === INIT_STATE && s.wrap === 0) {
        s.status = BUSY_STATE;
      }
      if (s.status === INIT_STATE) {
        let header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8;
        let level_flags = -1;
        if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
          level_flags = 0;
        } else if (s.level < 6) {
          level_flags = 1;
        } else if (s.level === 6) {
          level_flags = 2;
        } else {
          level_flags = 3;
        }
        header |= level_flags << 6;
        if (s.strstart !== 0) {
          header |= PRESET_DICT;
        }
        header += 31 - header % 31;
        putShortMSB(s, header);
        if (s.strstart !== 0) {
          putShortMSB(s, strm.adler >>> 16);
          putShortMSB(s, strm.adler & 65535);
        }
        strm.adler = 1;
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      }
      if (s.status === GZIP_STATE) {
        strm.adler = 0;
        put_byte(s, 31);
        put_byte(s, 139);
        put_byte(s, 8);
        if (!s.gzhead) {
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
          put_byte(s, OS_CODE);
          s.status = BUSY_STATE;
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        } else {
          put_byte(
            s,
            (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16)
          );
          put_byte(s, s.gzhead.time & 255);
          put_byte(s, s.gzhead.time >> 8 & 255);
          put_byte(s, s.gzhead.time >> 16 & 255);
          put_byte(s, s.gzhead.time >> 24 & 255);
          put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
          put_byte(s, s.gzhead.os & 255);
          if (s.gzhead.extra && s.gzhead.extra.length) {
            put_byte(s, s.gzhead.extra.length & 255);
            put_byte(s, s.gzhead.extra.length >> 8 & 255);
          }
          if (s.gzhead.hcrc) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
          }
          s.gzindex = 0;
          s.status = EXTRA_STATE;
        }
      }
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra) {
          let beg = s.pending;
          let left = (s.gzhead.extra.length & 65535) - s.gzindex;
          while (s.pending + left > s.pending_buf_size) {
            let copy = s.pending_buf_size - s.pending;
            s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
            s.pending = s.pending_buf_size;
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            s.gzindex += copy;
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return Z_OK;
            }
            beg = 0;
            left -= copy;
          }
          let gzhead_extra = new Uint8Array(s.gzhead.extra);
          s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
          s.pending += left;
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          s.gzindex = 0;
        }
        s.status = NAME_STATE;
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name) {
          let beg = s.pending;
          let val;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              if (s.pending !== 0) {
                s.last_flush = -1;
                return Z_OK;
              }
              beg = 0;
            }
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          s.gzindex = 0;
        }
        s.status = COMMENT_STATE;
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment) {
          let beg = s.pending;
          let val;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              if (s.pending !== 0) {
                s.last_flush = -1;
                return Z_OK;
              }
              beg = 0;
            }
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
        }
        s.status = HCRC_STATE;
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return Z_OK;
            }
          }
          put_byte(s, strm.adler & 255);
          put_byte(s, strm.adler >> 8 & 255);
          strm.adler = 0;
        }
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      }
      if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
        let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
          }
          return Z_OK;
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            _tr_align(s);
          } else if (flush !== Z_BLOCK) {
            _tr_stored_block(s, 0, 0, false);
            if (flush === Z_FULL_FLUSH) {
              zero(s.head);
              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        }
      }
      if (flush !== Z_FINISH) {
        return Z_OK;
      }
      if (s.wrap <= 0) {
        return Z_STREAM_END;
      }
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        put_byte(s, strm.adler >> 16 & 255);
        put_byte(s, strm.adler >> 24 & 255);
        put_byte(s, strm.total_in & 255);
        put_byte(s, strm.total_in >> 8 & 255);
        put_byte(s, strm.total_in >> 16 & 255);
        put_byte(s, strm.total_in >> 24 & 255);
      } else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      flush_pending(strm);
      if (s.wrap > 0) {
        s.wrap = -s.wrap;
      }
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    };
    var deflateEnd = (strm) => {
      if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const status = strm.state.status;
      strm.state = null;
      return status === BUSY_STATE ? err2(strm, Z_DATA_ERROR) : Z_OK;
    };
    var deflateSetDictionary = (strm, dictionary) => {
      let dictLength = dictionary.length;
      if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const s = strm.state;
      const wrap = s.wrap;
      if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
        return Z_STREAM_ERROR;
      }
      if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
      }
      s.wrap = 0;
      if (dictLength >= s.w_size) {
        if (wrap === 0) {
          zero(s.head);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        let tmpDict = new Uint8Array(s.w_size);
        tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      const avail = strm.avail_in;
      const next = strm.next_in;
      const input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH) {
        let str = s.strstart;
        let n = s.lookahead - (MIN_MATCH - 1);
        do {
          s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    };
    module.exports.deflateInit = deflateInit;
    module.exports.deflateInit2 = deflateInit2;
    module.exports.deflateReset = deflateReset;
    module.exports.deflateResetKeep = deflateResetKeep;
    module.exports.deflateSetHeader = deflateSetHeader;
    module.exports.deflate = deflate;
    module.exports.deflateEnd = deflateEnd;
    module.exports.deflateSetDictionary = deflateSetDictionary;
    module.exports.deflateInfo = "pako deflate (from Nodeca project)";
  }
});

// node_modules/pako/lib/utils/common.js
var require_common = __commonJS({
  "node_modules/pako/lib/utils/common.js"(exports, module) {
    "use strict";
    var _has = (obj, key) => {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };
    module.exports.assign = function(obj) {
      const sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        const source = sources.shift();
        if (!source) {
          continue;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be non-object");
        }
        for (const p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }
      return obj;
    };
    module.exports.flattenChunks = (chunks) => {
      let len = 0;
      for (let i2 = 0, l = chunks.length; i2 < l; i2++) {
        len += chunks[i2].length;
      }
      const result = new Uint8Array(len);
      for (let i2 = 0, pos = 0, l = chunks.length; i2 < l; i2++) {
        let chunk = chunks[i2];
        result.set(chunk, pos);
        pos += chunk.length;
      }
      return result;
    };
  }
});

// node_modules/pako/lib/utils/strings.js
var require_strings = __commonJS({
  "node_modules/pako/lib/utils/strings.js"(exports, module) {
    "use strict";
    var STR_APPLY_UIA_OK = true;
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (__) {
      STR_APPLY_UIA_OK = false;
    }
    var _utf8len = new Uint8Array(256);
    for (let q = 0; q < 256; q++) {
      _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
    }
    _utf8len[254] = _utf8len[254] = 1;
    module.exports.string2buf = (str) => {
      if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
        return new TextEncoder().encode(str);
      }
      let buf, c, c2, m_pos, i2, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      buf = new Uint8Array(buf_len);
      for (i2 = 0, m_pos = 0; i2 < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i2++] = c;
        } else if (c < 2048) {
          buf[i2++] = 192 | c >>> 6;
          buf[i2++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i2++] = 224 | c >>> 12;
          buf[i2++] = 128 | c >>> 6 & 63;
          buf[i2++] = 128 | c & 63;
        } else {
          buf[i2++] = 240 | c >>> 18;
          buf[i2++] = 128 | c >>> 12 & 63;
          buf[i2++] = 128 | c >>> 6 & 63;
          buf[i2++] = 128 | c & 63;
        }
      }
      return buf;
    };
    var buf2binstring = (buf, len) => {
      if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK) {
          return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
        }
      }
      let result = "";
      for (let i2 = 0; i2 < len; i2++) {
        result += String.fromCharCode(buf[i2]);
      }
      return result;
    };
    module.exports.buf2string = (buf, max2) => {
      const len = max2 || buf.length;
      if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
        return new TextDecoder().decode(buf.subarray(0, max2));
      }
      let i2, out;
      const utf16buf = new Array(len * 2);
      for (out = 0, i2 = 0; i2 < len; ) {
        let c = buf[i2++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        let c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i2 += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i2 < len) {
          c = c << 6 | buf[i2++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      return buf2binstring(utf16buf, out);
    };
    module.exports.utf8border = (buf, max2) => {
      max2 = max2 || buf.length;
      if (max2 > buf.length) {
        max2 = buf.length;
      }
      let pos = max2 - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max2;
      }
      if (pos === 0) {
        return max2;
      }
      return pos + _utf8len[buf[pos]] > max2 ? pos : max2;
    };
  }
});

// node_modules/pako/lib/zlib/zstream.js
var require_zstream = __commonJS({
  "node_modules/pako/lib/zlib/zstream.js"(exports, module) {
    "use strict";
    function ZStream() {
      this.input = null;
      this.next_in = 0;
      this.avail_in = 0;
      this.total_in = 0;
      this.output = null;
      this.next_out = 0;
      this.avail_out = 0;
      this.total_out = 0;
      this.msg = "";
      this.state = null;
      this.data_type = 2;
      this.adler = 0;
    }
    module.exports = ZStream;
  }
});

// node_modules/pako/lib/deflate.js
var require_deflate2 = __commonJS({
  "node_modules/pako/lib/deflate.js"(exports, module) {
    "use strict";
    var zlib_deflate = require_deflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var toString = Object.prototype.toString;
    var {
      Z_NO_FLUSH,
      Z_SYNC_FLUSH,
      Z_FULL_FLUSH,
      Z_FINISH,
      Z_OK,
      Z_STREAM_END,
      Z_DEFAULT_COMPRESSION,
      Z_DEFAULT_STRATEGY,
      Z_DEFLATED
    } = require_constants();
    function Deflate(options) {
      this.options = utils.assign({
        level: Z_DEFAULT_COMPRESSION,
        method: Z_DEFLATED,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY
      }, options || {});
      let opt = this.options;
      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      let status = zlib_deflate.deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      if (opt.header) {
        zlib_deflate.deflateSetHeader(this.strm, opt.header);
      }
      if (opt.dictionary) {
        let dict;
        if (typeof opt.dictionary === "string") {
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }
        status = zlib_deflate.deflateSetDictionary(this.strm, dict);
        if (status !== Z_OK) {
          throw new Error(msg[status]);
        }
        this._dict_set = true;
      }
    }
    Deflate.prototype.push = function(data, flush_mode) {
      const strm = this.strm;
      const chunkSize = this.options.chunkSize;
      let status, _flush_mode;
      if (this.ended) {
        return false;
      }
      if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
      else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      for (; ; ) {
        if (strm.avail_out === 0) {
          strm.output = new Uint8Array(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
          this.onData(strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          continue;
        }
        status = zlib_deflate.deflate(strm, _flush_mode);
        if (status === Z_STREAM_END) {
          if (strm.next_out > 0) {
            this.onData(strm.output.subarray(0, strm.next_out));
          }
          status = zlib_deflate.deflateEnd(this.strm);
          this.onEnd(status);
          this.ended = true;
          return status === Z_OK;
        }
        if (strm.avail_out === 0) {
          this.onData(strm.output);
          continue;
        }
        if (_flush_mode > 0 && strm.next_out > 0) {
          this.onData(strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          continue;
        }
        if (strm.avail_in === 0) break;
      }
      return true;
    };
    Deflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Deflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        this.result = utils.flattenChunks(this.chunks);
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function deflate(input, options) {
      const deflator = new Deflate(options);
      deflator.push(input, true);
      if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
      }
      return deflator.result;
    }
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate(input, options);
    }
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate(input, options);
    }
    module.exports.Deflate = Deflate;
    module.exports.deflate = deflate;
    module.exports.deflateRaw = deflateRaw;
    module.exports.gzip = gzip;
    module.exports.constants = require_constants();
  }
});

// node_modules/pako/lib/zlib/inffast.js
var require_inffast = __commonJS({
  "node_modules/pako/lib/zlib/inffast.js"(exports, module) {
    "use strict";
    var BAD = 16209;
    var TYPE = 16191;
    module.exports = function inflate_fast(strm, start) {
      let _in;
      let last;
      let _out;
      let beg;
      let end;
      let dmax;
      let wsize;
      let whave;
      let wnext;
      let s_window;
      let hold;
      let bits2;
      let lcode;
      let dcode;
      let lmask;
      let dmask;
      let here;
      let op;
      let len;
      let dist;
      let from;
      let from_source;
      let input, output;
      const state = strm.state;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
      dmax = state.dmax;
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits2 = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;
      top:
        do {
          if (bits2 < 15) {
            hold += input[_in++] << bits2;
            bits2 += 8;
            hold += input[_in++] << bits2;
            bits2 += 8;
          }
          here = lcode[hold & lmask];
          dolen:
            for (; ; ) {
              op = here >>> 24;
              hold >>>= op;
              bits2 -= op;
              op = here >>> 16 & 255;
              if (op === 0) {
                output[_out++] = here & 65535;
              } else if (op & 16) {
                len = here & 65535;
                op &= 15;
                if (op) {
                  if (bits2 < op) {
                    hold += input[_in++] << bits2;
                    bits2 += 8;
                  }
                  len += hold & (1 << op) - 1;
                  hold >>>= op;
                  bits2 -= op;
                }
                if (bits2 < 15) {
                  hold += input[_in++] << bits2;
                  bits2 += 8;
                  hold += input[_in++] << bits2;
                  bits2 += 8;
                }
                here = dcode[hold & dmask];
                dodist:
                  for (; ; ) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits2 -= op;
                    op = here >>> 16 & 255;
                    if (op & 16) {
                      dist = here & 65535;
                      op &= 15;
                      if (bits2 < op) {
                        hold += input[_in++] << bits2;
                        bits2 += 8;
                        if (bits2 < op) {
                          hold += input[_in++] << bits2;
                          bits2 += 8;
                        }
                      }
                      dist += hold & (1 << op) - 1;
                      if (dist > dmax) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD;
                        break top;
                      }
                      hold >>>= op;
                      bits2 -= op;
                      op = _out - beg;
                      if (dist > op) {
                        op = dist - op;
                        if (op > whave) {
                          if (state.sane) {
                            strm.msg = "invalid distance too far back";
                            state.mode = BAD;
                            break top;
                          }
                        }
                        from = 0;
                        from_source = s_window;
                        if (wnext === 0) {
                          from += wsize - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        } else if (wnext < op) {
                          from += wsize + wnext - op;
                          op -= wnext;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = 0;
                            if (wnext < len) {
                              op = wnext;
                              len -= op;
                              do {
                                output[_out++] = s_window[from++];
                              } while (--op);
                              from = _out - dist;
                              from_source = output;
                            }
                          }
                        } else {
                          from += wnext - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                        while (len > 2) {
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          len -= 3;
                        }
                        if (len) {
                          output[_out++] = from_source[from++];
                          if (len > 1) {
                            output[_out++] = from_source[from++];
                          }
                        }
                      } else {
                        from = _out - dist;
                        do {
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          len -= 3;
                        } while (len > 2);
                        if (len) {
                          output[_out++] = output[from++];
                          if (len > 1) {
                            output[_out++] = output[from++];
                          }
                        }
                      }
                    } else if ((op & 64) === 0) {
                      here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                      continue dodist;
                    } else {
                      strm.msg = "invalid distance code";
                      state.mode = BAD;
                      break top;
                    }
                    break;
                  }
              } else if ((op & 64) === 0) {
                here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
                continue dolen;
              } else if (op & 32) {
                state.mode = TYPE;
                break top;
              } else {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break top;
              }
              break;
            }
        } while (_in < last && _out < end);
      len = bits2 >> 3;
      _in -= len;
      bits2 -= len << 3;
      hold &= (1 << bits2) - 1;
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
      strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
      state.hold = hold;
      state.bits = bits2;
      return;
    };
  }
});

// node_modules/pako/lib/zlib/inftrees.js
var require_inftrees = __commonJS({
  "node_modules/pako/lib/zlib/inftrees.js"(exports, module) {
    "use strict";
    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var lbase = new Uint16Array([
      /* Length codes 257..285 base */
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ]);
    var lext = new Uint8Array([
      /* Length codes 257..285 extra */
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      17,
      17,
      17,
      18,
      18,
      18,
      18,
      19,
      19,
      19,
      19,
      20,
      20,
      20,
      20,
      21,
      21,
      21,
      21,
      16,
      72,
      78
    ]);
    var dbase = new Uint16Array([
      /* Distance codes 0..29 base */
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577,
      0,
      0
    ]);
    var dext = new Uint8Array([
      /* Distance codes 0..29 extra */
      16,
      16,
      16,
      16,
      17,
      17,
      18,
      18,
      19,
      19,
      20,
      20,
      21,
      21,
      22,
      22,
      23,
      23,
      24,
      24,
      25,
      25,
      26,
      26,
      27,
      27,
      28,
      28,
      29,
      29,
      64,
      64
    ]);
    var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
      const bits2 = opts.bits;
      let len = 0;
      let sym = 0;
      let min = 0, max2 = 0;
      let root = 0;
      let curr = 0;
      let drop = 0;
      let left = 0;
      let used = 0;
      let huff = 0;
      let incr;
      let fill;
      let low;
      let mask;
      let next;
      let base = null;
      let match;
      const count = new Uint16Array(MAXBITS + 1);
      const offs = new Uint16Array(MAXBITS + 1);
      let extra = null;
      let here_bits, here_op, here_val;
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }
      root = bits2;
      for (max2 = MAXBITS; max2 >= 1; max2--) {
        if (count[max2] !== 0) {
          break;
        }
      }
      if (root > max2) {
        root = max2;
      }
      if (max2 === 0) {
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        opts.bits = 1;
        return 0;
      }
      for (min = 1; min < max2; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }
      }
      if (left > 0 && (type === CODES || max2 !== 1)) {
        return -1;
      }
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }
      if (type === CODES) {
        base = extra = work;
        match = 20;
      } else if (type === LENS) {
        base = lbase;
        extra = lext;
        match = 257;
      } else {
        base = dbase;
        extra = dext;
        match = 0;
      }
      huff = 0;
      sym = 0;
      len = min;
      next = table_index;
      curr = root;
      drop = 0;
      low = -1;
      used = 1 << root;
      mask = used - 1;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      for (; ; ) {
        here_bits = len - drop;
        if (work[sym] + 1 < match) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] >= match) {
          here_op = extra[work[sym] - match];
          here_val = base[work[sym] - match];
        } else {
          here_op = 32 + 64;
          here_val = 0;
        }
        incr = 1 << len - drop;
        fill = 1 << curr;
        min = fill;
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
        } while (fill !== 0);
        incr = 1 << len - 1;
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
          if (len === max2) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
          if (drop === 0) {
            drop = root;
          }
          next += min;
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max2) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }
          used += 1 << curr;
          if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
            return 1;
          }
          low = huff & mask;
          table[low] = root << 24 | curr << 16 | next - table_index | 0;
        }
      }
      if (huff !== 0) {
        table[next + huff] = len - drop << 24 | 64 << 16 | 0;
      }
      opts.bits = root;
      return 0;
    };
    module.exports = inflate_table;
  }
});

// node_modules/pako/lib/zlib/inflate.js
var require_inflate = __commonJS({
  "node_modules/pako/lib/zlib/inflate.js"(exports, module) {
    "use strict";
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var inflate_fast = require_inffast();
    var inflate_table = require_inftrees();
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var {
      Z_FINISH,
      Z_BLOCK,
      Z_TREES,
      Z_OK,
      Z_STREAM_END,
      Z_NEED_DICT,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_MEM_ERROR,
      Z_BUF_ERROR,
      Z_DEFLATED
    } = require_constants();
    var HEAD = 16180;
    var FLAGS = 16181;
    var TIME = 16182;
    var OS = 16183;
    var EXLEN = 16184;
    var EXTRA = 16185;
    var NAME = 16186;
    var COMMENT = 16187;
    var HCRC = 16188;
    var DICTID = 16189;
    var DICT = 16190;
    var TYPE = 16191;
    var TYPEDO = 16192;
    var STORED = 16193;
    var COPY_ = 16194;
    var COPY = 16195;
    var TABLE = 16196;
    var LENLENS = 16197;
    var CODELENS = 16198;
    var LEN_ = 16199;
    var LEN = 16200;
    var LENEXT = 16201;
    var DIST = 16202;
    var DISTEXT = 16203;
    var MATCH = 16204;
    var LIT = 16205;
    var CHECK = 16206;
    var LENGTH = 16207;
    var DONE = 16208;
    var BAD = 16209;
    var MEM = 16210;
    var SYNC = 16211;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var MAX_WBITS = 15;
    var DEF_WBITS = MAX_WBITS;
    var zswap32 = (q) => {
      return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
    };
    function InflateState() {
      this.strm = null;
      this.mode = 0;
      this.last = false;
      this.wrap = 0;
      this.havedict = false;
      this.flags = 0;
      this.dmax = 0;
      this.check = 0;
      this.total = 0;
      this.head = null;
      this.wbits = 0;
      this.wsize = 0;
      this.whave = 0;
      this.wnext = 0;
      this.window = null;
      this.hold = 0;
      this.bits = 0;
      this.length = 0;
      this.offset = 0;
      this.extra = 0;
      this.lencode = null;
      this.distcode = null;
      this.lenbits = 0;
      this.distbits = 0;
      this.ncode = 0;
      this.nlen = 0;
      this.ndist = 0;
      this.have = 0;
      this.next = null;
      this.lens = new Uint16Array(320);
      this.work = new Uint16Array(288);
      this.lendyn = null;
      this.distdyn = null;
      this.sane = 0;
      this.back = 0;
      this.was = 0;
    }
    var inflateStateCheck = (strm) => {
      if (!strm) {
        return 1;
      }
      const state = strm.state;
      if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
        return 1;
      }
      return 0;
    };
    var inflateResetKeep = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = "";
      if (state.wrap) {
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.flags = -1;
      state.dmax = 32768;
      state.head = null;
      state.hold = 0;
      state.bits = 0;
      state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
      state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
      state.sane = 1;
      state.back = -1;
      return Z_OK;
    };
    var inflateReset = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);
    };
    var inflateReset2 = (strm, windowBits) => {
      let wrap;
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 5;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    };
    var inflateInit2 = (strm, windowBits) => {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      const state = new InflateState();
      strm.state = state;
      state.strm = strm;
      state.window = null;
      state.mode = HEAD;
      const ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK) {
        strm.state = null;
      }
      return ret;
    };
    var inflateInit = (strm) => {
      return inflateInit2(strm, DEF_WBITS);
    };
    var virgin = true;
    var lenfix;
    var distfix;
    var fixedtables = (state) => {
      if (virgin) {
        lenfix = new Int32Array(512);
        distfix = new Int32Array(32);
        let sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
        virgin = false;
      }
      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    };
    var updatewindow = (strm, src, end, copy) => {
      let dist;
      const state = strm.state;
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new Uint8Array(state.wsize);
      }
      if (copy >= state.wsize) {
        state.window.set(src.subarray(end - state.wsize, end), 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
        copy -= dist;
        if (copy) {
          state.window.set(src.subarray(end - copy, end), 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    };
    var inflate = (strm, flush) => {
      let state;
      let input, output;
      let next;
      let put;
      let have, left;
      let hold;
      let bits2;
      let _in, _out;
      let copy;
      let from;
      let from_source;
      let here = 0;
      let here_bits, here_op, here_val;
      let last_bits, last_op, last_val;
      let len;
      let ret;
      const hbuf = new Uint8Array(4);
      let opts;
      let n;
      const order = (
        /* permutation of code lengths */
        new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
      );
      if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      }
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits2 = state.bits;
      _in = have;
      _out = left;
      ret = Z_OK;
      inf_leave:
        for (; ; ) {
          switch (state.mode) {
            case HEAD:
              if (state.wrap === 0) {
                state.mode = TYPEDO;
                break;
              }
              while (bits2 < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              if (state.wrap & 2 && hold === 35615) {
                if (state.wbits === 0) {
                  state.wbits = 15;
                }
                state.check = 0;
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
                hold = 0;
                bits2 = 0;
                state.mode = FLAGS;
                break;
              }
              if (state.head) {
                state.head.done = false;
              }
              if (!(state.wrap & 1) || /* check if zlib header allowed */
              (((hold & 255) << 8) + (hold >> 8)) % 31) {
                strm.msg = "incorrect header check";
                state.mode = BAD;
                break;
              }
              if ((hold & 15) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              hold >>>= 4;
              bits2 -= 4;
              len = (hold & 15) + 8;
              if (state.wbits === 0) {
                state.wbits = len;
              }
              if (len > 15 || len > state.wbits) {
                strm.msg = "invalid window size";
                state.mode = BAD;
                break;
              }
              state.dmax = 1 << state.wbits;
              state.flags = 0;
              strm.adler = state.check = 1;
              state.mode = hold & 512 ? DICTID : TYPE;
              hold = 0;
              bits2 = 0;
              break;
            case FLAGS:
              while (bits2 < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              state.flags = hold;
              if ((state.flags & 255) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              if (state.flags & 57344) {
                strm.msg = "unknown header flags set";
                state.mode = BAD;
                break;
              }
              if (state.head) {
                state.head.text = hold >> 8 & 1;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits2 = 0;
              state.mode = TIME;
            /* falls through */
            case TIME:
              while (bits2 < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              if (state.head) {
                state.head.time = hold;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                hbuf[2] = hold >>> 16 & 255;
                hbuf[3] = hold >>> 24 & 255;
                state.check = crc32(state.check, hbuf, 4, 0);
              }
              hold = 0;
              bits2 = 0;
              state.mode = OS;
            /* falls through */
            case OS:
              while (bits2 < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              if (state.head) {
                state.head.xflags = hold & 255;
                state.head.os = hold >> 8;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits2 = 0;
              state.mode = EXLEN;
            /* falls through */
            case EXLEN:
              if (state.flags & 1024) {
                while (bits2 < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                state.length = hold;
                if (state.head) {
                  state.head.extra_len = hold;
                }
                if (state.flags & 512 && state.wrap & 4) {
                  hbuf[0] = hold & 255;
                  hbuf[1] = hold >>> 8 & 255;
                  state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits2 = 0;
              } else if (state.head) {
                state.head.extra = null;
              }
              state.mode = EXTRA;
            /* falls through */
            case EXTRA:
              if (state.flags & 1024) {
                copy = state.length;
                if (copy > have) {
                  copy = have;
                }
                if (copy) {
                  if (state.head) {
                    len = state.head.extra_len - state.length;
                    if (!state.head.extra) {
                      state.head.extra = new Uint8Array(state.head.extra_len);
                    }
                    state.head.extra.set(
                      input.subarray(
                        next,
                        // extra field is limited to 65536 bytes
                        // - no need for additional size check
                        next + copy
                      ),
                      /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                      len
                    );
                  }
                  if (state.flags & 512 && state.wrap & 4) {
                    state.check = crc32(state.check, input, copy, next);
                  }
                  have -= copy;
                  next += copy;
                  state.length -= copy;
                }
                if (state.length) {
                  break inf_leave;
                }
              }
              state.length = 0;
              state.mode = NAME;
            /* falls through */
            case NAME:
              if (state.flags & 2048) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.name += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.name = null;
              }
              state.length = 0;
              state.mode = COMMENT;
            /* falls through */
            case COMMENT:
              if (state.flags & 4096) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.comment += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.comment = null;
              }
              state.mode = HCRC;
            /* falls through */
            case HCRC:
              if (state.flags & 512) {
                while (bits2 < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                if (state.wrap & 4 && hold !== (state.check & 65535)) {
                  strm.msg = "header crc mismatch";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits2 = 0;
              }
              if (state.head) {
                state.head.hcrc = state.flags >> 9 & 1;
                state.head.done = true;
              }
              strm.adler = state.check = 0;
              state.mode = TYPE;
              break;
            case DICTID:
              while (bits2 < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              strm.adler = state.check = zswap32(hold);
              hold = 0;
              bits2 = 0;
              state.mode = DICT;
            /* falls through */
            case DICT:
              if (state.havedict === 0) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits2;
                return Z_NEED_DICT;
              }
              strm.adler = state.check = 1;
              state.mode = TYPE;
            /* falls through */
            case TYPE:
              if (flush === Z_BLOCK || flush === Z_TREES) {
                break inf_leave;
              }
            /* falls through */
            case TYPEDO:
              if (state.last) {
                hold >>>= bits2 & 7;
                bits2 -= bits2 & 7;
                state.mode = CHECK;
                break;
              }
              while (bits2 < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              state.last = hold & 1;
              hold >>>= 1;
              bits2 -= 1;
              switch (hold & 3) {
                case 0:
                  state.mode = STORED;
                  break;
                case 1:
                  fixedtables(state);
                  state.mode = LEN_;
                  if (flush === Z_TREES) {
                    hold >>>= 2;
                    bits2 -= 2;
                    break inf_leave;
                  }
                  break;
                case 2:
                  state.mode = TABLE;
                  break;
                case 3:
                  strm.msg = "invalid block type";
                  state.mode = BAD;
              }
              hold >>>= 2;
              bits2 -= 2;
              break;
            case STORED:
              hold >>>= bits2 & 7;
              bits2 -= bits2 & 7;
              while (bits2 < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
                strm.msg = "invalid stored block lengths";
                state.mode = BAD;
                break;
              }
              state.length = hold & 65535;
              hold = 0;
              bits2 = 0;
              state.mode = COPY_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            /* falls through */
            case COPY_:
              state.mode = COPY;
            /* falls through */
            case COPY:
              copy = state.length;
              if (copy) {
                if (copy > have) {
                  copy = have;
                }
                if (copy > left) {
                  copy = left;
                }
                if (copy === 0) {
                  break inf_leave;
                }
                output.set(input.subarray(next, next + copy), put);
                have -= copy;
                next += copy;
                left -= copy;
                put += copy;
                state.length -= copy;
                break;
              }
              state.mode = TYPE;
              break;
            case TABLE:
              while (bits2 < 14) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              state.nlen = (hold & 31) + 257;
              hold >>>= 5;
              bits2 -= 5;
              state.ndist = (hold & 31) + 1;
              hold >>>= 5;
              bits2 -= 5;
              state.ncode = (hold & 15) + 4;
              hold >>>= 4;
              bits2 -= 4;
              if (state.nlen > 286 || state.ndist > 30) {
                strm.msg = "too many length or distance symbols";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = LENLENS;
            /* falls through */
            case LENLENS:
              while (state.have < state.ncode) {
                while (bits2 < 3) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                state.lens[order[state.have++]] = hold & 7;
                hold >>>= 3;
                bits2 -= 3;
              }
              while (state.have < 19) {
                state.lens[order[state.have++]] = 0;
              }
              state.lencode = state.lendyn;
              state.lenbits = 7;
              opts = { bits: state.lenbits };
              ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid code lengths set";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = CODELENS;
            /* falls through */
            case CODELENS:
              while (state.have < state.nlen + state.ndist) {
                for (; ; ) {
                  here = state.lencode[hold & (1 << state.lenbits) - 1];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (here_bits <= bits2) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                if (here_val < 16) {
                  hold >>>= here_bits;
                  bits2 -= here_bits;
                  state.lens[state.have++] = here_val;
                } else {
                  if (here_val === 16) {
                    n = here_bits + 2;
                    while (bits2 < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits2;
                      bits2 += 8;
                    }
                    hold >>>= here_bits;
                    bits2 -= here_bits;
                    if (state.have === 0) {
                      strm.msg = "invalid bit length repeat";
                      state.mode = BAD;
                      break;
                    }
                    len = state.lens[state.have - 1];
                    copy = 3 + (hold & 3);
                    hold >>>= 2;
                    bits2 -= 2;
                  } else if (here_val === 17) {
                    n = here_bits + 3;
                    while (bits2 < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits2;
                      bits2 += 8;
                    }
                    hold >>>= here_bits;
                    bits2 -= here_bits;
                    len = 0;
                    copy = 3 + (hold & 7);
                    hold >>>= 3;
                    bits2 -= 3;
                  } else {
                    n = here_bits + 7;
                    while (bits2 < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits2;
                      bits2 += 8;
                    }
                    hold >>>= here_bits;
                    bits2 -= here_bits;
                    len = 0;
                    copy = 11 + (hold & 127);
                    hold >>>= 7;
                    bits2 -= 7;
                  }
                  if (state.have + copy > state.nlen + state.ndist) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  while (copy--) {
                    state.lens[state.have++] = len;
                  }
                }
              }
              if (state.mode === BAD) {
                break;
              }
              if (state.lens[256] === 0) {
                strm.msg = "invalid code -- missing end-of-block";
                state.mode = BAD;
                break;
              }
              state.lenbits = 9;
              opts = { bits: state.lenbits };
              ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid literal/lengths set";
                state.mode = BAD;
                break;
              }
              state.distbits = 6;
              state.distcode = state.distdyn;
              opts = { bits: state.distbits };
              ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
              state.distbits = opts.bits;
              if (ret) {
                strm.msg = "invalid distances set";
                state.mode = BAD;
                break;
              }
              state.mode = LEN_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            /* falls through */
            case LEN_:
              state.mode = LEN;
            /* falls through */
            case LEN:
              if (have >= 6 && left >= 258) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits2;
                inflate_fast(strm, _out);
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits2 = state.bits;
                if (state.mode === TYPE) {
                  state.back = -1;
                }
                break;
              }
              state.back = 0;
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits2) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              if (here_op && (here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits2) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                hold >>>= last_bits;
                bits2 -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits2 -= here_bits;
              state.back += here_bits;
              state.length = here_val;
              if (here_op === 0) {
                state.mode = LIT;
                break;
              }
              if (here_op & 32) {
                state.back = -1;
                state.mode = TYPE;
                break;
              }
              if (here_op & 64) {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break;
              }
              state.extra = here_op & 15;
              state.mode = LENEXT;
            /* falls through */
            case LENEXT:
              if (state.extra) {
                n = state.extra;
                while (bits2 < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                state.length += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits2 -= state.extra;
                state.back += state.extra;
              }
              state.was = state.length;
              state.mode = DIST;
            /* falls through */
            case DIST:
              for (; ; ) {
                here = state.distcode[hold & (1 << state.distbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits2) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits2;
                bits2 += 8;
              }
              if ((here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits2) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                hold >>>= last_bits;
                bits2 -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits2 -= here_bits;
              state.back += here_bits;
              if (here_op & 64) {
                strm.msg = "invalid distance code";
                state.mode = BAD;
                break;
              }
              state.offset = here_val;
              state.extra = here_op & 15;
              state.mode = DISTEXT;
            /* falls through */
            case DISTEXT:
              if (state.extra) {
                n = state.extra;
                while (bits2 < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                state.offset += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits2 -= state.extra;
                state.back += state.extra;
              }
              if (state.offset > state.dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
              state.mode = MATCH;
            /* falls through */
            case MATCH:
              if (left === 0) {
                break inf_leave;
              }
              copy = _out - left;
              if (state.offset > copy) {
                copy = state.offset - copy;
                if (copy > state.whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break;
                  }
                }
                if (copy > state.wnext) {
                  copy -= state.wnext;
                  from = state.wsize - copy;
                } else {
                  from = state.wnext - copy;
                }
                if (copy > state.length) {
                  copy = state.length;
                }
                from_source = state.window;
              } else {
                from_source = output;
                from = put - state.offset;
                copy = state.length;
              }
              if (copy > left) {
                copy = left;
              }
              left -= copy;
              state.length -= copy;
              do {
                output[put++] = from_source[from++];
              } while (--copy);
              if (state.length === 0) {
                state.mode = LEN;
              }
              break;
            case LIT:
              if (left === 0) {
                break inf_leave;
              }
              output[put++] = state.length;
              left--;
              state.mode = LEN;
              break;
            case CHECK:
              if (state.wrap) {
                while (bits2 < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold |= input[next++] << bits2;
                  bits2 += 8;
                }
                _out -= left;
                strm.total_out += _out;
                state.total += _out;
                if (state.wrap & 4 && _out) {
                  strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
                  state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
                }
                _out = left;
                if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
                  strm.msg = "incorrect data check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits2 = 0;
              }
              state.mode = LENGTH;
            /* falls through */
            case LENGTH:
              if (state.wrap && state.flags) {
                while (bits2 < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits2;
                  bits2 += 8;
                }
                if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
                  strm.msg = "incorrect length check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits2 = 0;
              }
              state.mode = DONE;
            /* falls through */
            case DONE:
              ret = Z_STREAM_END;
              break inf_leave;
            case BAD:
              ret = Z_DATA_ERROR;
              break inf_leave;
            case MEM:
              return Z_MEM_ERROR;
            case SYNC:
            /* falls through */
            default:
              return Z_STREAM_ERROR;
          }
        }
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits2;
      if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
          state.mode = MEM;
          return Z_MEM_ERROR;
        }
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap & 4 && _out) {
        strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
        state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
        ret = Z_BUF_ERROR;
      }
      return ret;
    };
    var inflateEnd = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      let state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK;
    };
    var inflateGetHeader = (strm, head) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR;
      }
      state.head = head;
      head.done = false;
      return Z_OK;
    };
    var inflateSetDictionary = (strm, dictionary) => {
      const dictLength = dictionary.length;
      let state;
      let dictid;
      let ret;
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR;
      }
      if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR;
        }
      }
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      return Z_OK;
    };
    module.exports.inflateReset = inflateReset;
    module.exports.inflateReset2 = inflateReset2;
    module.exports.inflateResetKeep = inflateResetKeep;
    module.exports.inflateInit = inflateInit;
    module.exports.inflateInit2 = inflateInit2;
    module.exports.inflate = inflate;
    module.exports.inflateEnd = inflateEnd;
    module.exports.inflateGetHeader = inflateGetHeader;
    module.exports.inflateSetDictionary = inflateSetDictionary;
    module.exports.inflateInfo = "pako inflate (from Nodeca project)";
  }
});

// node_modules/pako/lib/zlib/gzheader.js
var require_gzheader = __commonJS({
  "node_modules/pako/lib/zlib/gzheader.js"(exports, module) {
    "use strict";
    function GZheader() {
      this.text = 0;
      this.time = 0;
      this.xflags = 0;
      this.os = 0;
      this.extra = null;
      this.extra_len = 0;
      this.name = "";
      this.comment = "";
      this.hcrc = 0;
      this.done = false;
    }
    module.exports = GZheader;
  }
});

// node_modules/pako/lib/inflate.js
var require_inflate2 = __commonJS({
  "node_modules/pako/lib/inflate.js"(exports, module) {
    "use strict";
    var zlib_inflate = require_inflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var GZheader = require_gzheader();
    var toString = Object.prototype.toString;
    var {
      Z_NO_FLUSH,
      Z_FINISH,
      Z_OK,
      Z_STREAM_END,
      Z_NEED_DICT,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_MEM_ERROR
    } = require_constants();
    function Inflate(options) {
      this.options = utils.assign({
        chunkSize: 1024 * 64,
        windowBits: 15,
        to: ""
      }, options || {});
      const opt = this.options;
      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }
      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }
      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      let status = zlib_inflate.inflateInit2(
        this.strm,
        opt.windowBits
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      this.header = new GZheader();
      zlib_inflate.inflateGetHeader(this.strm, this.header);
      if (opt.dictionary) {
        if (typeof opt.dictionary === "string") {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) {
          status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== Z_OK) {
            throw new Error(msg[status]);
          }
        }
      }
    }
    Inflate.prototype.push = function(data, flush_mode) {
      const strm = this.strm;
      const chunkSize = this.options.chunkSize;
      const dictionary = this.options.dictionary;
      let status, _flush_mode, last_avail_out;
      if (this.ended) return false;
      if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
      else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      for (; ; ) {
        if (strm.avail_out === 0) {
          strm.output = new Uint8Array(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_inflate.inflate(strm, _flush_mode);
        if (status === Z_NEED_DICT && dictionary) {
          status = zlib_inflate.inflateSetDictionary(strm, dictionary);
          if (status === Z_OK) {
            status = zlib_inflate.inflate(strm, _flush_mode);
          } else if (status === Z_DATA_ERROR) {
            status = Z_NEED_DICT;
          }
        }
        while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
          zlib_inflate.inflateReset(strm);
          status = zlib_inflate.inflate(strm, _flush_mode);
        }
        switch (status) {
          case Z_STREAM_ERROR:
          case Z_DATA_ERROR:
          case Z_NEED_DICT:
          case Z_MEM_ERROR:
            this.onEnd(status);
            this.ended = true;
            return false;
        }
        last_avail_out = strm.avail_out;
        if (strm.next_out) {
          if (strm.avail_out === 0 || status === Z_STREAM_END) {
            if (this.options.to === "string") {
              let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
              let tail = strm.next_out - next_out_utf8;
              let utf8str = strings.buf2string(strm.output, next_out_utf8);
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
              this.onData(utf8str);
            } else {
              this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
            }
          }
        }
        if (status === Z_OK && last_avail_out === 0) continue;
        if (status === Z_STREAM_END) {
          status = zlib_inflate.inflateEnd(this.strm);
          this.onEnd(status);
          this.ended = true;
          return true;
        }
        if (strm.avail_in === 0) break;
      }
      return true;
    };
    Inflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Inflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function inflate(input, options) {
      const inflator = new Inflate(options);
      inflator.push(input);
      if (inflator.err) throw inflator.msg || msg[inflator.err];
      return inflator.result;
    }
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate(input, options);
    }
    module.exports.Inflate = Inflate;
    module.exports.inflate = inflate;
    module.exports.inflateRaw = inflateRaw;
    module.exports.ungzip = inflate;
    module.exports.constants = require_constants();
  }
});

// node_modules/pako/index.js
var require_pako = __commonJS({
  "node_modules/pako/index.js"(exports, module) {
    "use strict";
    var { Deflate, deflate, deflateRaw, gzip } = require_deflate2();
    var { Inflate, inflate, inflateRaw, ungzip } = require_inflate2();
    var constants = require_constants();
    module.exports.Deflate = Deflate;
    module.exports.deflate = deflate;
    module.exports.deflateRaw = deflateRaw;
    module.exports.gzip = gzip;
    module.exports.Inflate = Inflate;
    module.exports.inflate = inflate;
    module.exports.inflateRaw = inflateRaw;
    module.exports.ungzip = ungzip;
    module.exports.constants = constants;
  }
});

// node_modules/ag-psd/dist/jpeg.js
var require_jpeg = __commonJS({
  "node_modules/ag-psd/dist/jpeg.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeJpeg = decodeJpeg;
    var dctZigZag = new Int32Array([
      0,
      1,
      8,
      16,
      9,
      2,
      3,
      10,
      17,
      24,
      32,
      25,
      18,
      11,
      4,
      5,
      12,
      19,
      26,
      33,
      40,
      48,
      41,
      34,
      27,
      20,
      13,
      6,
      7,
      14,
      21,
      28,
      35,
      42,
      49,
      56,
      57,
      50,
      43,
      36,
      29,
      22,
      15,
      23,
      30,
      37,
      44,
      51,
      58,
      59,
      52,
      45,
      38,
      31,
      39,
      46,
      53,
      60,
      61,
      54,
      47,
      55,
      62,
      63
    ]);
    var dctCos1 = 4017;
    var dctSin1 = 799;
    var dctCos3 = 3406;
    var dctSin3 = 2276;
    var dctCos6 = 1567;
    var dctSin6 = 3784;
    var dctSqrt2 = 5793;
    var dctSqrt1d2 = 2896;
    var maxResolutionInMP = 100;
    var maxMemoryUsageBytes = 64 * 1024 * 1024;
    var totalBytesAllocated = 0;
    function requestMemoryAllocation(increaseAmount) {
      const totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
      if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
        const exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
        throw new Error(`Max memory limit exceeded by at least ${exceededAmount}MB`);
      }
      totalBytesAllocated = totalMemoryImpactBytes;
    }
    function buildHuffmanTable(codeLengths, values) {
      let length = 16;
      while (length > 0 && !codeLengths[length - 1])
        length--;
      const code = [{ children: [], index: 0 }];
      let k = 0;
      let p = code[0];
      for (let i2 = 0; i2 < length; i2++) {
        for (let j = 0; j < codeLengths[i2]; j++) {
          p = code.pop();
          p.children[p.index] = values[k];
          while (p.index > 0) {
            if (code.length === 0)
              throw new Error("Could not recreate Huffman Table");
            p = code.pop();
          }
          p.index++;
          code.push(p);
          while (code.length <= i2) {
            const q = { children: [], index: 0 };
            code.push(q);
            p.children[p.index] = q.children;
            p = q;
          }
          k++;
        }
        if (i2 + 1 < length) {
          const q = { children: [], index: 0 };
          code.push(q);
          p.children[p.index] = q.children;
          p = q;
        }
      }
      return code[0].children;
    }
    function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive) {
      const mcusPerLine = frame.mcusPerLine;
      const progressive = frame.progressive;
      const startOffset = offset;
      let bitsData = 0;
      let bitsCount = 0;
      function readBit() {
        if (bitsCount > 0) {
          bitsCount--;
          return bitsData >> bitsCount & 1;
        }
        bitsData = data[offset++];
        if (bitsData == 255) {
          const nextByte = data[offset++];
          if (nextByte)
            throw new Error(`unexpected marker: ${(bitsData << 8 | nextByte).toString(16)}`);
        }
        bitsCount = 7;
        return bitsData >>> 7;
      }
      function decodeHuffman(tree) {
        let node = tree;
        while (true) {
          node = node[readBit()];
          if (typeof node === "number")
            return node;
          if (node === void 0)
            throw new Error("invalid huffman sequence");
        }
      }
      function receive(length) {
        let n = 0;
        while (length > 0) {
          n = n << 1 | readBit();
          length--;
        }
        return n;
      }
      function receiveAndExtend(length) {
        let n = receive(length);
        if (n >= 1 << length - 1)
          return n;
        return n + (-1 << length) + 1;
      }
      function decodeBaseline(component2, zz) {
        const t = decodeHuffman(component2.huffmanTableDC);
        const diff = t === 0 ? 0 : receiveAndExtend(t);
        zz[0] = component2.pred += diff;
        let k = 1;
        while (k < 64) {
          const rs = decodeHuffman(component2.huffmanTableAC);
          const s = rs & 15;
          const r = rs >> 4;
          if (s === 0) {
            if (r < 15)
              break;
            k += 16;
            continue;
          }
          k += r;
          const z = dctZigZag[k];
          zz[z] = receiveAndExtend(s);
          k++;
        }
      }
      function decodeDCFirst(component2, zz) {
        const t = decodeHuffman(component2.huffmanTableDC);
        const diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
        zz[0] = component2.pred += diff;
      }
      function decodeDCSuccessive(_component, zz) {
        zz[0] |= readBit() << successive;
      }
      let eobrun = 0;
      function decodeACFirst(component2, zz) {
        if (eobrun > 0) {
          eobrun--;
          return;
        }
        let k = spectralStart, e = spectralEnd;
        while (k <= e) {
          const rs = decodeHuffman(component2.huffmanTableAC);
          const s = rs & 15;
          const r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = receive(r) + (1 << r) - 1;
              break;
            }
            k += 16;
            continue;
          }
          k += r;
          const z = dctZigZag[k];
          zz[z] = receiveAndExtend(s) * (1 << successive);
          k++;
        }
      }
      let successiveACState = 0;
      let successiveACNextValue = 0;
      function decodeACSuccessive(component2, zz) {
        let k = spectralStart;
        let e = spectralEnd;
        let r = 0;
        while (k <= e) {
          const z = dctZigZag[k];
          const direction = zz[z] < 0 ? -1 : 1;
          switch (successiveACState) {
            case 0:
              const rs = decodeHuffman(component2.huffmanTableAC);
              const s = rs & 15;
              r = rs >> 4;
              if (s === 0) {
                if (r < 15) {
                  eobrun = receive(r) + (1 << r);
                  successiveACState = 4;
                } else {
                  r = 16;
                  successiveACState = 1;
                }
              } else {
                if (s !== 1)
                  throw new Error("invalid ACn encoding");
                successiveACNextValue = receiveAndExtend(s);
                successiveACState = r ? 2 : 3;
              }
              continue;
            case 1:
            // skipping r zero items
            case 2:
              if (zz[z]) {
                zz[z] += (readBit() << successive) * direction;
              } else {
                r--;
                if (r === 0)
                  successiveACState = successiveACState == 2 ? 3 : 0;
              }
              break;
            case 3:
              if (zz[z]) {
                zz[z] += (readBit() << successive) * direction;
              } else {
                zz[z] = successiveACNextValue << successive;
                successiveACState = 0;
              }
              break;
            case 4:
              if (zz[z]) {
                zz[z] += (readBit() << successive) * direction;
              }
              break;
          }
          k++;
        }
        if (successiveACState === 4) {
          eobrun--;
          if (eobrun === 0)
            successiveACState = 0;
        }
      }
      function decodeMcu(component2, decode, mcu2, row, col) {
        const mcuRow = mcu2 / mcusPerLine | 0;
        const mcuCol = mcu2 % mcusPerLine;
        const blockRow = mcuRow * component2.v + row;
        const blockCol = mcuCol * component2.h + col;
        if (component2.blocks[blockRow] === void 0)
          return;
        decode(component2, component2.blocks[blockRow][blockCol]);
      }
      function decodeBlock(component2, decode, mcu2) {
        const blockRow = mcu2 / component2.blocksPerLine | 0;
        const blockCol = mcu2 % component2.blocksPerLine;
        if (component2.blocks[blockRow] === void 0)
          return;
        decode(component2, component2.blocks[blockRow][blockCol]);
      }
      const componentsLength = components.length;
      let component;
      let decodeFn;
      if (progressive) {
        if (spectralStart === 0) {
          decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
        } else {
          decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        }
      } else {
        decodeFn = decodeBaseline;
      }
      let mcu = 0;
      let mcuExpected;
      if (componentsLength == 1) {
        mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
      } else {
        mcuExpected = mcusPerLine * frame.mcusPerColumn;
      }
      if (!resetInterval)
        resetInterval = mcuExpected;
      let h;
      let v;
      let marker;
      while (mcu < mcuExpected) {
        for (let i2 = 0; i2 < componentsLength; i2++)
          components[i2].pred = 0;
        eobrun = 0;
        if (componentsLength == 1) {
          component = components[0];
          for (let n = 0; n < resetInterval; n++) {
            decodeBlock(component, decodeFn, mcu);
            mcu++;
          }
        } else {
          for (let n = 0; n < resetInterval; n++) {
            for (let i2 = 0; i2 < componentsLength; i2++) {
              component = components[i2];
              h = component.h;
              v = component.v;
              for (let j = 0; j < v; j++) {
                for (let k = 0; k < h; k++) {
                  decodeMcu(component, decodeFn, mcu, j, k);
                }
              }
            }
            mcu++;
            if (mcu === mcuExpected)
              break;
          }
        }
        if (mcu === mcuExpected) {
          do {
            if (data[offset] === 255) {
              if (data[offset + 1] !== 0) {
                break;
              }
            }
            offset += 1;
          } while (offset < data.length - 2);
        }
        bitsCount = 0;
        marker = data[offset] << 8 | data[offset + 1];
        if (marker < 65280)
          throw new Error("marker was not found");
        if (marker >= 65488 && marker <= 65495) {
          offset += 2;
        } else {
          break;
        }
      }
      return offset - startOffset;
    }
    function buildComponentData(component) {
      const lines = [];
      const blocksPerLine = component.blocksPerLine;
      const blocksPerColumn = component.blocksPerColumn;
      const samplesPerLine = blocksPerLine << 3;
      const R2 = new Int32Array(64);
      const r = new Uint8Array(64);
      function quantizeAndInverse(zz, dataOut, dataIn) {
        const qt = component.quantizationTable;
        const p = dataIn;
        for (let i2 = 0; i2 < 64; i2++) {
          p[i2] = zz[i2] * qt[i2];
        }
        for (let i2 = 0; i2 < 8; ++i2) {
          const row = 8 * i2;
          if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
            const t2 = dctSqrt2 * p[0 + row] + 512 >> 10;
            p[0 + row] = t2;
            p[1 + row] = t2;
            p[2 + row] = t2;
            p[3 + row] = t2;
            p[4 + row] = t2;
            p[5 + row] = t2;
            p[6 + row] = t2;
            p[7 + row] = t2;
            continue;
          }
          let v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
          let v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
          let v2 = p[2 + row];
          let v3 = p[6 + row];
          let v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
          let v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
          let v5 = p[3 + row] << 4;
          let v6 = p[5 + row] << 4;
          let t = v0 - v1 + 1 >> 1;
          v0 = v0 + v1 + 1 >> 1;
          v1 = t;
          t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
          v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
          v3 = t;
          t = v4 - v6 + 1 >> 1;
          v4 = v4 + v6 + 1 >> 1;
          v6 = t;
          t = v7 + v5 + 1 >> 1;
          v5 = v7 - v5 + 1 >> 1;
          v7 = t;
          t = v0 - v3 + 1 >> 1;
          v0 = v0 + v3 + 1 >> 1;
          v3 = t;
          t = v1 - v2 + 1 >> 1;
          v1 = v1 + v2 + 1 >> 1;
          v2 = t;
          t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
          v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
          v7 = t;
          t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
          v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
          v6 = t;
          p[0 + row] = v0 + v7;
          p[7 + row] = v0 - v7;
          p[1 + row] = v1 + v6;
          p[6 + row] = v1 - v6;
          p[2 + row] = v2 + v5;
          p[5 + row] = v2 - v5;
          p[3 + row] = v3 + v4;
          p[4 + row] = v3 - v4;
        }
        for (let i2 = 0; i2 < 8; ++i2) {
          const col = i2;
          if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
            const t2 = dctSqrt2 * dataIn[i2 + 0] + 8192 >> 14;
            p[0 * 8 + col] = t2;
            p[1 * 8 + col] = t2;
            p[2 * 8 + col] = t2;
            p[3 * 8 + col] = t2;
            p[4 * 8 + col] = t2;
            p[5 * 8 + col] = t2;
            p[6 * 8 + col] = t2;
            p[7 * 8 + col] = t2;
            continue;
          }
          let v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
          let v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
          let v2 = p[2 * 8 + col];
          let v3 = p[6 * 8 + col];
          let v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
          let v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
          let v5 = p[3 * 8 + col];
          let v6 = p[5 * 8 + col];
          let t = v0 - v1 + 1 >> 1;
          v0 = v0 + v1 + 1 >> 1;
          v1 = t;
          t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
          v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
          v3 = t;
          t = v4 - v6 + 1 >> 1;
          v4 = v4 + v6 + 1 >> 1;
          v6 = t;
          t = v7 + v5 + 1 >> 1;
          v5 = v7 - v5 + 1 >> 1;
          v7 = t;
          t = v0 - v3 + 1 >> 1;
          v0 = v0 + v3 + 1 >> 1;
          v3 = t;
          t = v1 - v2 + 1 >> 1;
          v1 = v1 + v2 + 1 >> 1;
          v2 = t;
          t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
          v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
          v7 = t;
          t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
          v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
          v6 = t;
          p[0 * 8 + col] = v0 + v7;
          p[7 * 8 + col] = v0 - v7;
          p[1 * 8 + col] = v1 + v6;
          p[6 * 8 + col] = v1 - v6;
          p[2 * 8 + col] = v2 + v5;
          p[5 * 8 + col] = v2 - v5;
          p[3 * 8 + col] = v3 + v4;
          p[4 * 8 + col] = v3 - v4;
        }
        for (let i2 = 0; i2 < 64; ++i2) {
          const sample = 128 + (p[i2] + 8 >> 4);
          dataOut[i2] = sample < 0 ? 0 : sample > 255 ? 255 : sample;
        }
      }
      requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
      for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
        const scanLine = blockRow << 3;
        for (let i2 = 0; i2 < 8; i2++)
          lines.push(new Uint8Array(samplesPerLine));
        for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
          quantizeAndInverse(component.blocks[blockRow][blockCol], r, R2);
          let offset = 0;
          const sample = blockCol << 3;
          for (let j = 0; j < 8; j++) {
            const line = lines[scanLine + j];
            for (let i2 = 0; i2 < 8; i2++)
              line[sample + i2] = r[offset++];
          }
        }
      }
      return lines;
    }
    function clampTo8bit(a) {
      return a < 0 ? 0 : a > 255 ? 255 : a;
    }
    function parse(data) {
      const self = {
        width: 0,
        height: 0,
        adobe: void 0,
        components: [],
        exifBuffer: void 0,
        jfif: void 0
      };
      const maxResolutionInPixels = maxResolutionInMP * 1e3 * 1e3;
      let offset = 0;
      function readUint16() {
        const value = data[offset] << 8 | data[offset + 1];
        offset += 2;
        return value;
      }
      function readDataBlock() {
        const length = readUint16();
        const array = data.subarray(offset, offset + length - 2);
        offset += array.length;
        return array;
      }
      function prepareComponents(frame2) {
        let maxH = 0, maxV = 0;
        for (let componentId in frame2.components) {
          if (frame2.components.hasOwnProperty(componentId)) {
            const component = frame2.components[componentId];
            if (maxH < component.h)
              maxH = component.h;
            if (maxV < component.v)
              maxV = component.v;
          }
        }
        const mcusPerLine = Math.ceil(frame2.samplesPerLine / 8 / maxH);
        const mcusPerColumn = Math.ceil(frame2.scanLines / 8 / maxV);
        for (let componentId in frame2.components) {
          if (frame2.components.hasOwnProperty(componentId)) {
            const component = frame2.components[componentId];
            const blocksPerLine = Math.ceil(Math.ceil(frame2.samplesPerLine / 8) * component.h / maxH);
            const blocksPerColumn = Math.ceil(Math.ceil(frame2.scanLines / 8) * component.v / maxV);
            const blocksPerLineForMcu = mcusPerLine * component.h;
            const blocksPerColumnForMcu = mcusPerColumn * component.v;
            const blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
            const blocks = [];
            requestMemoryAllocation(blocksToAllocate * 256);
            for (let i2 = 0; i2 < blocksPerColumnForMcu; i2++) {
              const row = [];
              for (let j = 0; j < blocksPerLineForMcu; j++) {
                row.push(new Int32Array(64));
              }
              blocks.push(row);
            }
            component.blocksPerLine = blocksPerLine;
            component.blocksPerColumn = blocksPerColumn;
            component.blocks = blocks;
          }
        }
        frame2.maxH = maxH;
        frame2.maxV = maxV;
        frame2.mcusPerLine = mcusPerLine;
        frame2.mcusPerColumn = mcusPerColumn;
      }
      let jfif = null;
      let adobe = null;
      let frame = void 0;
      let resetInterval = 0;
      let quantizationTables = [];
      let frames = [];
      let huffmanTablesAC = [];
      let huffmanTablesDC = [];
      let fileMarker = readUint16();
      let malformedDataOffset = -1;
      if (fileMarker != 65496) {
        throw new Error("SOI not found");
      }
      fileMarker = readUint16();
      while (fileMarker != 65497) {
        switch (fileMarker) {
          case 65280:
            break;
          case 65504:
          // APP0 (Application Specific)
          case 65505:
          // APP1
          case 65506:
          // APP2
          case 65507:
          // APP3
          case 65508:
          // APP4
          case 65509:
          // APP5
          case 65510:
          // APP6
          case 65511:
          // APP7
          case 65512:
          // APP8
          case 65513:
          // APP9
          case 65514:
          // APP10
          case 65515:
          // APP11
          case 65516:
          // APP12
          case 65517:
          // APP13
          case 65518:
          // APP14
          case 65519:
          // APP15
          case 65534: {
            const appData = readDataBlock();
            if (fileMarker === 65534) {
            }
            if (fileMarker === 65504) {
              if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                jfif = {
                  version: { major: appData[5], minor: appData[6] },
                  densityUnits: appData[7],
                  xDensity: appData[8] << 8 | appData[9],
                  yDensity: appData[10] << 8 | appData[11],
                  thumbWidth: appData[12],
                  thumbHeight: appData[13],
                  thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                };
              }
            }
            if (fileMarker === 65505) {
              if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                self.exifBuffer = appData.subarray(5, appData.length);
              }
            }
            if (fileMarker === 65518) {
              if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                adobe = {
                  version: appData[6],
                  flags0: appData[7] << 8 | appData[8],
                  flags1: appData[9] << 8 | appData[10],
                  transformCode: appData[11]
                };
              }
            }
            break;
          }
          case 65499: {
            const quantizationTablesLength = readUint16();
            const quantizationTablesEnd = quantizationTablesLength + offset - 2;
            while (offset < quantizationTablesEnd) {
              const quantizationTableSpec = data[offset++];
              requestMemoryAllocation(64 * 4);
              const tableData = new Int32Array(64);
              if (quantizationTableSpec >> 4 === 0) {
                for (let j = 0; j < 64; j++) {
                  const z = dctZigZag[j];
                  tableData[z] = data[offset++];
                }
              } else if (quantizationTableSpec >> 4 === 1) {
                for (let j = 0; j < 64; j++) {
                  const z = dctZigZag[j];
                  tableData[z] = readUint16();
                }
              } else
                throw new Error("DQT: invalid table spec");
              quantizationTables[quantizationTableSpec & 15] = tableData;
            }
            break;
          }
          case 65472:
          // SOF0 (Start of Frame, Baseline DCT)
          case 65473:
          // SOF1 (Start of Frame, Extended DCT)
          case 65474: {
            readUint16();
            frame = {
              extended: fileMarker === 65473,
              progressive: fileMarker === 65474,
              precision: data[offset++],
              scanLines: readUint16(),
              samplesPerLine: readUint16(),
              components: {},
              componentsOrder: [],
              maxH: 0,
              maxV: 0,
              mcusPerLine: 0,
              mcusPerColumn: 0
            };
            const pixelsInFrame = frame.scanLines * frame.samplesPerLine;
            if (pixelsInFrame > maxResolutionInPixels) {
              const exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
              throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
            }
            const componentsCount = data[offset++];
            for (let i2 = 0; i2 < componentsCount; i2++) {
              const componentId = data[offset];
              const h = data[offset + 1] >> 4;
              const v = data[offset + 1] & 15;
              const qId = data[offset + 2];
              frame.componentsOrder.push(componentId);
              frame.components[componentId] = {
                h,
                v,
                quantizationIdx: qId,
                blocksPerColumn: 0,
                blocksPerLine: 0,
                blocks: [],
                pred: 0
              };
              offset += 3;
            }
            prepareComponents(frame);
            frames.push(frame);
            break;
          }
          case 65476: {
            const huffmanLength = readUint16();
            for (let i2 = 2; i2 < huffmanLength; ) {
              const huffmanTableSpec = data[offset++];
              const codeLengths = new Uint8Array(16);
              let codeLengthSum = 0;
              for (let j = 0; j < 16; j++, offset++) {
                codeLengthSum += codeLengths[j] = data[offset];
              }
              requestMemoryAllocation(16 + codeLengthSum);
              const huffmanValues = new Uint8Array(codeLengthSum);
              for (let j = 0; j < codeLengthSum; j++, offset++) {
                huffmanValues[j] = data[offset];
              }
              i2 += 17 + codeLengthSum;
              const index = huffmanTableSpec & 15;
              const table = huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC;
              table[index] = buildHuffmanTable(codeLengths, huffmanValues);
            }
            break;
          }
          case 65501:
            readUint16();
            resetInterval = readUint16();
            break;
          case 65500:
            readUint16();
            readUint16();
            break;
          case 65498: {
            readUint16();
            const selectorsCount = data[offset++];
            const components = [];
            for (let i2 = 0; i2 < selectorsCount; i2++) {
              const component = frame.components[data[offset++]];
              const tableSpec = data[offset++];
              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
              components.push(component);
            }
            const spectralStart = data[offset++];
            const spectralEnd = data[offset++];
            const successiveApproximation = data[offset++];
            const processed = decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successiveApproximation >> 4, successiveApproximation & 15);
            offset += processed;
            break;
          }
          case 65535:
            if (data[offset] !== 255) {
              offset--;
            }
            break;
          default: {
            if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
              offset -= 3;
              break;
            } else if (fileMarker === 224 || fileMarker == 225) {
              if (malformedDataOffset !== -1) {
                throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
              }
              malformedDataOffset = offset - 1;
              const nextOffset = readUint16();
              if (data[offset + nextOffset - 2] === 255) {
                offset += nextOffset - 2;
                break;
              }
            }
            throw new Error("unknown JPEG marker " + fileMarker.toString(16));
          }
        }
        fileMarker = readUint16();
      }
      if (frames.length != 1)
        throw new Error("only single frame JPEGs supported");
      for (let i2 = 0; i2 < frames.length; i2++) {
        const cp = frames[i2].components;
        for (let j in cp) {
          cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
          delete cp[j].quantizationIdx;
        }
      }
      self.width = frame.samplesPerLine;
      self.height = frame.scanLines;
      self.jfif = jfif;
      self.adobe = adobe;
      self.components = [];
      for (let i2 = 0; i2 < frame.componentsOrder.length; i2++) {
        const component = frame.components[frame.componentsOrder[i2]];
        self.components.push({
          lines: buildComponentData(component),
          scaleX: component.h / frame.maxH,
          scaleY: component.v / frame.maxV
        });
      }
      return self;
    }
    function getData(decoded) {
      let offset = 0;
      let colorTransform = false;
      const width = decoded.width;
      const height = decoded.height;
      const dataLength = width * height * decoded.components.length;
      requestMemoryAllocation(dataLength);
      const data = new Uint8Array(dataLength);
      switch (decoded.components.length) {
        case 1: {
          const component1 = decoded.components[0];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            for (let x2 = 0; x2 < width; x2++) {
              const Y = component1Line[0 | x2 * component1.scaleX];
              data[offset++] = Y;
            }
          }
          break;
        }
        case 2: {
          const component1 = decoded.components[0];
          const component2 = decoded.components[1];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            const component2Line = component2.lines[0 | y * component2.scaleY];
            for (let x2 = 0; x2 < width; x2++) {
              const Y1 = component1Line[0 | x2 * component1.scaleX];
              data[offset++] = Y1;
              const Y2 = component2Line[0 | x2 * component2.scaleX];
              data[offset++] = Y2;
            }
          }
          break;
        }
        case 3: {
          colorTransform = true;
          if (decoded.adobe && decoded.adobe.transformCode)
            colorTransform = true;
          const component1 = decoded.components[0];
          const component2 = decoded.components[1];
          const component3 = decoded.components[2];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            const component2Line = component2.lines[0 | y * component2.scaleY];
            const component3Line = component3.lines[0 | y * component3.scaleY];
            for (let x2 = 0; x2 < width; x2++) {
              let Y, Cb, Cr, R2, G, B;
              if (!colorTransform) {
                R2 = component1Line[0 | x2 * component1.scaleX];
                G = component2Line[0 | x2 * component2.scaleX];
                B = component3Line[0 | x2 * component3.scaleX];
              } else {
                Y = component1Line[0 | x2 * component1.scaleX];
                Cb = component2Line[0 | x2 * component2.scaleX];
                Cr = component3Line[0 | x2 * component3.scaleX];
                R2 = clampTo8bit(Y + 1.402 * (Cr - 128));
                G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                B = clampTo8bit(Y + 1.772 * (Cb - 128));
              }
              data[offset++] = R2;
              data[offset++] = G;
              data[offset++] = B;
            }
          }
          break;
        }
        case 4: {
          if (!decoded.adobe)
            throw new Error("Unsupported color mode (4 components)");
          colorTransform = false;
          if (decoded.adobe && decoded.adobe.transformCode)
            colorTransform = true;
          const component1 = decoded.components[0];
          const component2 = decoded.components[1];
          const component3 = decoded.components[2];
          const component4 = decoded.components[3];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            const component2Line = component2.lines[0 | y * component2.scaleY];
            const component3Line = component3.lines[0 | y * component3.scaleY];
            const component4Line = component4.lines[0 | y * component4.scaleY];
            for (let x2 = 0; x2 < width; x2++) {
              let Y, Cb, Cr, K, C, M, Ye;
              if (!colorTransform) {
                C = component1Line[0 | x2 * component1.scaleX];
                M = component2Line[0 | x2 * component2.scaleX];
                Ye = component3Line[0 | x2 * component3.scaleX];
                K = component4Line[0 | x2 * component4.scaleX];
              } else {
                Y = component1Line[0 | x2 * component1.scaleX];
                Cb = component2Line[0 | x2 * component2.scaleX];
                Cr = component3Line[0 | x2 * component3.scaleX];
                K = component4Line[0 | x2 * component4.scaleX];
                C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
              }
              data[offset++] = 255 - C;
              data[offset++] = 255 - M;
              data[offset++] = 255 - Ye;
              data[offset++] = 255 - K;
            }
          }
          break;
        }
        default:
          throw new Error("Unsupported color mode");
      }
      return data;
    }
    function decodeJpeg(encoded, createImageData) {
      totalBytesAllocated = 0;
      if (encoded.length === 0)
        throw new Error("Empty jpeg buffer");
      const decoded = parse(encoded);
      requestMemoryAllocation(decoded.width * decoded.height * 4);
      const data = getData(decoded);
      const imageData = createImageData(decoded.width, decoded.height);
      const width = imageData.width;
      const height = imageData.height;
      const imageDataArray = imageData.data;
      let i2 = 0;
      let j = 0;
      switch (decoded.components.length) {
        case 1:
          for (let y = 0; y < height; y++) {
            for (let x2 = 0; x2 < width; x2++) {
              const Y = data[i2++];
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = 255;
            }
          }
          break;
        case 2:
          for (let y = 0; y < height; y++) {
            for (let x2 = 0; x2 < width; x2++) {
              const Y = data[i2++];
              const A = data[i2++];
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = A;
            }
          }
          break;
        case 3:
          for (let y = 0; y < height; y++) {
            for (let x2 = 0; x2 < width; x2++) {
              const R2 = data[i2++];
              const G = data[i2++];
              const B = data[i2++];
              imageDataArray[j++] = R2;
              imageDataArray[j++] = G;
              imageDataArray[j++] = B;
              imageDataArray[j++] = 255;
            }
          }
          break;
        case 4:
          for (let y = 0; y < height; y++) {
            for (let x2 = 0; x2 < width; x2++) {
              const C = data[i2++];
              const M = data[i2++];
              const Y = data[i2++];
              const K = data[i2++];
              const R2 = 255 - clampTo8bit(C * (1 - K / 255) + K);
              const G = 255 - clampTo8bit(M * (1 - K / 255) + K);
              const B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
              imageDataArray[j++] = R2;
              imageDataArray[j++] = G;
              imageDataArray[j++] = B;
              imageDataArray[j++] = 255;
            }
          }
          break;
        default:
          throw new Error("Unsupported color mode");
      }
      return imageData;
    }
  }
});

// node_modules/ag-psd/dist/helpers.js
var require_helpers = __commonJS({
  "node_modules/ag-psd/dist/helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createImageData = exports.createCanvas = exports.MaskParams = exports.LayerMaskFlags = exports.ColorSpace = exports.largeAdditionalInfoKeys = exports.layerColors = exports.toBlendMode = exports.fromBlendMode = exports.RAW_IMAGE_DATA = exports.MOCK_HANDLERS = void 0;
    exports.revMap = revMap;
    exports.createEnum = createEnum;
    exports.offsetForChannel = offsetForChannel;
    exports.clamp = clamp;
    exports.hasAlpha = hasAlpha;
    exports.resetImageData = resetImageData;
    exports.imageDataToCanvas = imageDataToCanvas;
    exports.decodeBitmap = decodeBitmap;
    exports.writeDataRaw = writeDataRaw;
    exports.writeDataRLE = writeDataRLE;
    exports.writeDataZipWithoutPrediction = writeDataZipWithoutPrediction;
    exports.createCanvasFromData = createCanvasFromData;
    exports.initializeCanvas = initializeCanvas;
    var pako_1 = require_pako();
    var jpeg_1 = require_jpeg();
    exports.MOCK_HANDLERS = false;
    exports.RAW_IMAGE_DATA = false;
    exports.fromBlendMode = {};
    exports.toBlendMode = {
      "pass": "pass through",
      "norm": "normal",
      "diss": "dissolve",
      "dark": "darken",
      "mul ": "multiply",
      "idiv": "color burn",
      "lbrn": "linear burn",
      "dkCl": "darker color",
      "lite": "lighten",
      "scrn": "screen",
      "div ": "color dodge",
      "lddg": "linear dodge",
      "lgCl": "lighter color",
      "over": "overlay",
      "sLit": "soft light",
      "hLit": "hard light",
      "vLit": "vivid light",
      "lLit": "linear light",
      "pLit": "pin light",
      "hMix": "hard mix",
      "diff": "difference",
      "smud": "exclusion",
      "fsub": "subtract",
      "fdiv": "divide",
      "hue ": "hue",
      "sat ": "saturation",
      "colr": "color",
      "lum ": "luminosity"
    };
    Object.keys(exports.toBlendMode).forEach((key) => exports.fromBlendMode[exports.toBlendMode[key]] = key);
    exports.layerColors = [
      "none",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "violet",
      "gray"
    ];
    exports.largeAdditionalInfoKeys = [
      // from documentation
      "LMsk",
      "Lr16",
      "Lr32",
      "Layr",
      "Mt16",
      "Mt32",
      "Mtrn",
      "Alph",
      "FMsk",
      "lnk2",
      "FEid",
      "FXid",
      "PxSD",
      // from guessing
      "cinf"
    ];
    function revMap(map) {
      const result = {};
      Object.keys(map).forEach((key) => result[map[key]] = key);
      return result;
    }
    function createEnum(prefix, def, map) {
      const rev2 = revMap(map);
      const decode = (val) => {
        const value = val.split(".")[1];
        if (value && !rev2[value]) {
          if (Object.prototype.hasOwnProperty.call(map, value))
            return value;
          const spaced = value.replace(/([A-Z])/g, " $1").toLowerCase();
          if (Object.prototype.hasOwnProperty.call(map, spaced))
            return spaced;
          throw new Error(`Unrecognized value for enum: '${val}'`);
        }
        return rev2[value] || def;
      };
      const encode = (val) => {
        if (val && !map[val])
          throw new Error(`Invalid value for enum: '${val}'`);
        return `${prefix}.${val ? map[val] : map[def]}`;
      };
      return { decode, encode };
    }
    var ColorSpace;
    (function(ColorSpace2) {
      ColorSpace2[ColorSpace2["RGB"] = 0] = "RGB";
      ColorSpace2[ColorSpace2["HSB"] = 1] = "HSB";
      ColorSpace2[ColorSpace2["CMYK"] = 2] = "CMYK";
      ColorSpace2[ColorSpace2["Lab"] = 7] = "Lab";
      ColorSpace2[ColorSpace2["Grayscale"] = 8] = "Grayscale";
    })(ColorSpace || (exports.ColorSpace = ColorSpace = {}));
    var LayerMaskFlags;
    (function(LayerMaskFlags2) {
      LayerMaskFlags2[LayerMaskFlags2["PositionRelativeToLayer"] = 1] = "PositionRelativeToLayer";
      LayerMaskFlags2[LayerMaskFlags2["LayerMaskDisabled"] = 2] = "LayerMaskDisabled";
      LayerMaskFlags2[LayerMaskFlags2["InvertLayerMaskWhenBlending"] = 4] = "InvertLayerMaskWhenBlending";
      LayerMaskFlags2[LayerMaskFlags2["LayerMaskFromRenderingOtherData"] = 8] = "LayerMaskFromRenderingOtherData";
      LayerMaskFlags2[LayerMaskFlags2["MaskHasParametersAppliedToIt"] = 16] = "MaskHasParametersAppliedToIt";
    })(LayerMaskFlags || (exports.LayerMaskFlags = LayerMaskFlags = {}));
    var MaskParams;
    (function(MaskParams2) {
      MaskParams2[MaskParams2["UserMaskDensity"] = 1] = "UserMaskDensity";
      MaskParams2[MaskParams2["UserMaskFeather"] = 2] = "UserMaskFeather";
      MaskParams2[MaskParams2["VectorMaskDensity"] = 4] = "VectorMaskDensity";
      MaskParams2[MaskParams2["VectorMaskFeather"] = 8] = "VectorMaskFeather";
    })(MaskParams || (exports.MaskParams = MaskParams = {}));
    function offsetForChannel(channelId, cmyk) {
      switch (channelId) {
        case 0:
          return 0;
        case 1:
          return 1;
        case 2:
          return 2;
        case 3:
          return cmyk ? 3 : channelId + 1;
        case -1:
          return cmyk ? 4 : 3;
        default:
          return channelId + 1;
      }
    }
    function clamp(value, min, max2) {
      return value < min ? min : value > max2 ? max2 : value;
    }
    function hasAlpha(data) {
      const size = data.width * data.height * 4;
      for (let i2 = 3; i2 < size; i2 += 4) {
        if (data.data[i2] !== 255) {
          return true;
        }
      }
      return false;
    }
    function resetImageData({ data }) {
      const alpha = data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;
      for (let p = 0, size = data.length | 0; p < size; p = p + 4 | 0) {
        data[p + 0] = 0;
        data[p + 1] = 0;
        data[p + 2] = 0;
        data[p + 3] = alpha;
      }
    }
    function imageDataToCanvas(pixelData) {
      const canvas = (0, exports.createCanvas)(pixelData.width, pixelData.height);
      let imageData;
      if (pixelData.data instanceof Uint8ClampedArray) {
        imageData = pixelData;
      } else {
        imageData = (0, exports.createImageData)(pixelData.width, pixelData.height);
        const src = pixelData.data;
        const dst = imageData.data;
        if (src instanceof Float32Array) {
          for (let i2 = 0, size = src.length; i2 < size; i2 += 4) {
            dst[i2 + 0] = Math.round(Math.pow(src[i2 + 0], 1 / 2.2) * 255);
            dst[i2 + 1] = Math.round(Math.pow(src[i2 + 1], 1 / 2.2) * 255);
            dst[i2 + 2] = Math.round(Math.pow(src[i2 + 2], 1 / 2.2) * 255);
            dst[i2 + 3] = Math.round(src[i2 + 3] * 255);
          }
        } else {
          const shift = src instanceof Uint16Array ? 8 : 0;
          for (let i2 = 0, size = src.length; i2 < size; i2++) {
            dst[i2] = src[i2] >>> shift;
          }
        }
      }
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      return canvas;
    }
    function decodeBitmap(input, output, width, height) {
      if (!(input instanceof Uint8Array || input instanceof Uint8ClampedArray))
        throw new Error("Invalid bit depth");
      for (let y = 0, p = 0, o = 0; y < height; y++) {
        for (let x2 = 0; x2 < width; ) {
          let b = input[o++];
          for (let i2 = 0; i2 < 8 && x2 < width; i2++, x2++, p += 4) {
            const v = b & 128 ? 0 : 255;
            b = b << 1;
            output[p + 0] = v;
            output[p + 1] = v;
            output[p + 2] = v;
            output[p + 3] = 255;
          }
        }
      }
    }
    function writeDataRaw(data, offset, width, height) {
      if (!width || !height)
        return void 0;
      const array = new Uint8Array(width * height);
      for (let i2 = 0; i2 < array.length; i2++) {
        array[i2] = data.data[i2 * 4 + offset];
      }
      return array;
    }
    function writeDataRLE(buffer, { data, width, height }, offsets, large) {
      if (!width || !height)
        return void 0;
      const stride = 4 * width | 0;
      let ol = 0;
      let o = offsets.length * (large ? 4 : 2) * height | 0;
      for (const offset of offsets) {
        for (let y = 0, p = offset | 0; y < height; y++) {
          const strideStart = y * stride | 0;
          const strideEnd = strideStart + stride | 0;
          const lastIndex = strideEnd + offset - 4 | 0;
          const lastIndex2 = lastIndex - 4 | 0;
          const startOffset = o;
          for (p = strideStart + offset | 0; p < strideEnd; p = p + 4 | 0) {
            if (p < lastIndex2) {
              let value1 = data[p];
              p = p + 4 | 0;
              let value2 = data[p];
              p = p + 4 | 0;
              let value3 = data[p];
              if (value1 === value2 && value1 === value3) {
                let count = 3;
                while (count < 128 && p < lastIndex && data[p + 4 | 0] === value1) {
                  count = count + 1 | 0;
                  p = p + 4 | 0;
                }
                buffer[o++] = 1 - count;
                buffer[o++] = value1;
              } else {
                const countIndex = o;
                let writeLast = true;
                let count = 1;
                buffer[o++] = 0;
                buffer[o++] = value1;
                while (p < lastIndex && count < 128) {
                  p = p + 4 | 0;
                  value1 = value2;
                  value2 = value3;
                  value3 = data[p];
                  if (value1 === value2 && value1 === value3) {
                    p = p - 12 | 0;
                    writeLast = false;
                    break;
                  } else {
                    count++;
                    buffer[o++] = value1;
                  }
                }
                if (writeLast) {
                  if (count < 127) {
                    buffer[o++] = value2;
                    buffer[o++] = value3;
                    count += 2;
                  } else if (count < 128) {
                    buffer[o++] = value2;
                    count++;
                    p = p - 4 | 0;
                  } else {
                    p = p - 8 | 0;
                  }
                }
                buffer[countIndex] = count - 1;
              }
            } else if (p === lastIndex) {
              buffer[o++] = 0;
              buffer[o++] = data[p];
            } else {
              buffer[o++] = 1;
              buffer[o++] = data[p];
              p = p + 4 | 0;
              buffer[o++] = data[p];
            }
          }
          const length = o - startOffset;
          if (large) {
            buffer[ol++] = length >> 24 & 255;
            buffer[ol++] = length >> 16 & 255;
          }
          buffer[ol++] = length >> 8 & 255;
          buffer[ol++] = length & 255;
        }
      }
      return buffer.slice(0, o);
    }
    function writeDataZipWithoutPrediction({ data, width, height }, offsets) {
      const size = width * height;
      const channel = new Uint8Array(size);
      const buffers = [];
      let totalLength = 0;
      for (const offset of offsets) {
        for (let i2 = 0, o = offset; i2 < size; i2++, o += 4) {
          channel[i2] = data[o];
        }
        const buffer = (0, pako_1.deflate)(channel);
        buffers.push(buffer);
        totalLength += buffer.byteLength;
      }
      if (buffers.length > 0) {
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const b of buffers) {
          buffer.set(b, offset);
          offset += b.byteLength;
        }
        return buffer;
      } else {
        return buffers[0];
      }
    }
    function createCanvasFromData(data) {
      const canvas = (0, exports.createCanvas)(100, 100);
      try {
        const context = canvas.getContext("2d");
        const imageData = (0, jpeg_1.decodeJpeg)(data, (w, h) => context.createImageData(w, h));
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        context.putImageData(imageData, 0, 0);
      } catch (e) {
        console.error("JPEG decompression error", e.message);
      }
      return canvas;
    }
    var createCanvas = () => {
      throw new Error("Canvas not initialized, use initializeCanvas method to set up createCanvas method");
    };
    exports.createCanvas = createCanvas;
    var tempCanvas = void 0;
    var createImageData = (width, height) => {
      if (!tempCanvas)
        tempCanvas = (0, exports.createCanvas)(1, 1);
      return tempCanvas.getContext("2d").createImageData(width, height);
    };
    exports.createImageData = createImageData;
    if (typeof document !== "undefined") {
      exports.createCanvas = (width, height) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
      };
    }
    function initializeCanvas(createCanvasMethod, createImageDataMethod) {
      exports.createCanvas = createCanvasMethod;
      exports.createImageData = createImageDataMethod || exports.createImageData;
    }
  }
});

// node_modules/base64-js/index.js
var require_base64_js = __commonJS({
  "node_modules/base64-js/index.js"(exports) {
    "use strict";
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray;
    exports.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i2 = 0, len = code.length; i2 < len; ++i2) {
      lookup[i2] = code[i2];
      revLookup[code.charCodeAt(i2)] = i2;
    }
    var i2;
    var len;
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1) validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i3;
      for (i3 = 0; i3 < len2; i3 += 4) {
        tmp = revLookup[b64.charCodeAt(i3)] << 18 | revLookup[b64.charCodeAt(i3 + 1)] << 12 | revLookup[b64.charCodeAt(i3 + 2)] << 6 | revLookup[b64.charCodeAt(i3 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i3)] << 2 | revLookup[b64.charCodeAt(i3 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i3)] << 10 | revLookup[b64.charCodeAt(i3 + 1)] << 4 | revLookup[b64.charCodeAt(i3 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i3 = start; i3 < end; i3 += 3) {
        tmp = (uint8[i3] << 16 & 16711680) + (uint8[i3 + 1] << 8 & 65280) + (uint8[i3 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i3 = 0, len22 = len2 - extraBytes; i3 < len22; i3 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i3, i3 + maxChunkLength > len22 ? len22 : i3 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
        );
      }
      return parts.join("");
    }
  }
});

// node_modules/ag-psd/dist/utf8.js
var require_utf8 = __commonJS({
  "node_modules/ag-psd/dist/utf8.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stringLengthInBytes = stringLengthInBytes;
    exports.encodeStringTo = encodeStringTo;
    exports.encodeString = encodeString;
    exports.decodeString = decodeString;
    function charLengthInBytes(code) {
      if ((code & 4294967168) === 0) {
        return 1;
      } else if ((code & 4294965248) === 0) {
        return 2;
      } else if ((code & 4294901760) === 0) {
        return 3;
      } else {
        return 4;
      }
    }
    function codePointAt(value, i2) {
      const code = value.charCodeAt(i2);
      if (code >= 55296 && code <= 56319 && i2 + 1 < value.length) {
        const extra = value.charCodeAt(i2 + 1);
        if (extra >= 56320 && extra <= 57343) {
          return { code: ((code & 1023) << 10) + (extra & 1023) + 65536, size: 2 };
        }
      }
      if (code >= 55296 && code <= 57343) {
        return { code: 65533, size: 1 };
      }
      return { code, size: 1 };
    }
    function stringLengthInBytes(value) {
      let result = 0;
      for (let i2 = 0; i2 < value.length; ) {
        const { code, size } = codePointAt(value, i2);
        result += charLengthInBytes(code);
        i2 += size;
      }
      return result;
    }
    function writeCharacter(buffer, offset, code) {
      const length = charLengthInBytes(code);
      switch (length) {
        case 1:
          buffer[offset] = code;
          break;
        case 2:
          buffer[offset] = code >> 6 & 31 | 192;
          buffer[offset + 1] = code & 63 | 128;
          break;
        case 3:
          buffer[offset] = code >> 12 & 15 | 224;
          buffer[offset + 1] = code >> 6 & 63 | 128;
          buffer[offset + 2] = code & 63 | 128;
          break;
        default:
          buffer[offset] = code >> 18 & 7 | 240;
          buffer[offset + 1] = code >> 12 & 63 | 128;
          buffer[offset + 2] = code >> 6 & 63 | 128;
          buffer[offset + 3] = code & 63 | 128;
          break;
      }
      return length;
    }
    function encodeStringTo(buffer, offset, value) {
      for (let i2 = 0; i2 < value.length; ) {
        const { code, size } = codePointAt(value, i2);
        offset += writeCharacter(buffer, offset, code);
        i2 += size;
      }
      return offset;
    }
    function encodeString(value) {
      if (value.length > 1e3 && typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(value);
      }
      const buffer = new Uint8Array(stringLengthInBytes(value));
      encodeStringTo(buffer, 0, value);
      return buffer;
    }
    function decodeString(value) {
      if (value.byteLength > 1e3 && typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(value);
      }
      const result = [];
      function pushCodePoint(code) {
        if (code > 65535) {
          code -= 65536;
          result.push(String.fromCharCode(code >>> 10 & 1023 | 55296));
          code = 56320 | code & 1023;
        }
        result.push(String.fromCharCode(code));
      }
      let codePoint = 0;
      let bytesSeen = 0;
      let bytesNeeded = 0;
      let lowerBoundary = 128;
      let upperBoundary = 191;
      for (let i2 = 0; i2 < value.length; i2++) {
        const byte = value[i2];
        if (bytesNeeded === 0) {
          if (byte <= 127) {
            pushCodePoint(byte);
          } else if (byte >= 194 && byte <= 223) {
            bytesNeeded = 1;
            codePoint = byte & 31;
          } else if (byte >= 224 && byte <= 239) {
            if (byte === 224)
              lowerBoundary = 160;
            if (byte === 237)
              upperBoundary = 159;
            bytesNeeded = 2;
            codePoint = byte & 15;
          } else if (byte >= 240 && byte <= 244) {
            if (byte === 240)
              lowerBoundary = 144;
            if (byte === 244)
              upperBoundary = 143;
            bytesNeeded = 3;
            codePoint = byte & 7;
          } else {
            pushCodePoint(65533);
          }
          continue;
        }
        if (byte < lowerBoundary || byte > upperBoundary) {
          codePoint = 0;
          bytesNeeded = 0;
          bytesSeen = 0;
          lowerBoundary = 128;
          upperBoundary = 191;
          pushCodePoint(65533);
          i2--;
          continue;
        }
        lowerBoundary = 128;
        upperBoundary = 191;
        codePoint = codePoint << 6 | byte & 63;
        bytesSeen++;
        if (bytesSeen !== bytesNeeded)
          continue;
        pushCodePoint(codePoint);
        codePoint = 0;
        bytesNeeded = 0;
        bytesSeen = 0;
      }
      if (bytesNeeded !== 0) {
        pushCodePoint(65533);
      }
      return result.join("");
    }
  }
});

// node_modules/ag-psd/dist/descriptor.js
var require_descriptor = __commonJS({
  "node_modules/ag-psd/dist/descriptor.js"(exports) {
    "use strict";
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i2 = 0, p = Object.getOwnPropertySymbols(s); i2 < p.length; i2++) {
          if (e.indexOf(p[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i2]))
            t[p[i2]] = s[p[i2]];
        }
      return t;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IntC = exports.IntE = exports.Drct = exports.WndM = exports.CntE = exports.FlCl = exports.ExtR = exports.ExtT = exports.DfsM = exports.blurType = exports.Lns = exports.MztT = exports.Chnl = exports.Dstr = exports.ZZTy = exports.Wvtp = exports.SphM = exports.RplS = exports.Cnvr = exports.UndA = exports.DspM = exports.SmBQ = exports.SmBM = exports.BlrQ = exports.BlrM = exports.strokeStyleLineAlignment = exports.strokeStyleLineJoinType = exports.strokeStyleLineCapType = exports.ESliceBGColorType = exports.ESliceOrigin = exports.ESliceVertAlign = exports.ESliceHorzAlign = exports.ESliceType = exports.FrFl = exports.FStl = exports.ClrS = exports.gradientInterpolationMethodType = exports.stdTrackID = exports.animInterpStyleEnum = exports.GrdT = exports.IGSr = exports.BETE = exports.BESs = exports.bvlT = exports.BESl = exports.BlnM = exports.warpStyle = exports.Annt = exports.Ornt = exports.textGridding = void 0;
    exports.presetKindType = exports.prjM = exports.FlMd = void 0;
    exports.setLogErrors = setLogErrors;
    exports.readAsciiStringOrClassId = readAsciiStringOrClassId;
    exports.readDescriptorStructure = readDescriptorStructure;
    exports.writeDescriptorStructure = writeDescriptorStructure;
    exports.readVersionAndDescriptor = readVersionAndDescriptor;
    exports.writeVersionAndDescriptor = writeVersionAndDescriptor;
    exports.horzVrtcToXY = horzVrtcToXY;
    exports.xyToHorzVrtc = xyToHorzVrtc;
    exports.descBoundsToBounds = descBoundsToBounds;
    exports.boundsToDescBounds = boundsToDescBounds;
    exports.serializeEffects = serializeEffects;
    exports.parseEffects = parseEffects;
    exports.parseTrackList = parseTrackList;
    exports.serializeTrackList = serializeTrackList;
    exports.parseVectorContent = parseVectorContent;
    exports.serializeVectorContent = serializeVectorContent;
    exports.parseColor = parseColor;
    exports.serializeColor = serializeColor;
    exports.parseAngle = parseAngle;
    exports.parsePercent = parsePercent;
    exports.parsePercentOrAngle = parsePercentOrAngle;
    exports.parseUnits = parseUnits;
    exports.parseUnitsOrNumber = parseUnitsOrNumber;
    exports.parseUnitsToNumber = parseUnitsToNumber;
    exports.unitsAngle = unitsAngle;
    exports.unitsPercent = unitsPercent;
    exports.unitsPercentF = unitsPercentF;
    exports.unitsValue = unitsValue;
    exports.frac = frac;
    var helpers_1 = require_helpers();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    function revMap(map) {
      const result = {};
      Object.keys(map).forEach((key) => result[map[key]] = key);
      return result;
    }
    var unitsMap = {
      "#Ang": "Angle",
      "#Rsl": "Density",
      "#Rlt": "Distance",
      "#Nne": "None",
      "#Prc": "Percent",
      "#Pxl": "Pixels",
      "#Mlm": "Millimeters",
      "#Pnt": "Points",
      "RrPi": "Picas",
      "RrIn": "Inches",
      "RrCm": "Centimeters"
    };
    var unitsMapRev = revMap(unitsMap);
    var logErrors = false;
    function setLogErrors(value) {
      logErrors = value;
    }
    function makeType(name, classID) {
      return { name, classID };
    }
    var nullType = makeType("", "null");
    var USE_CHINESE = false;
    var fieldToExtType = {
      strokeStyleContent: makeType("", "solidColorLayer"),
      printProofSetup: makeType(USE_CHINESE ? "\u6821\u6837\u8BBE\u7F6E" : "Proof Setup", "proofSetup"),
      Grad: makeType(USE_CHINESE ? "\u6E10\u53D8" : "Gradient", "Grdn"),
      Trnf: makeType(USE_CHINESE ? "\u53D8\u6362" : "Transform", "Trnf"),
      patternFill: makeType("", "patternFill"),
      ebbl: makeType("", "ebbl"),
      SoFi: makeType("", "SoFi"),
      GrFl: makeType("", "GrFl"),
      sdwC: makeType("", "RGBC"),
      hglC: makeType("", "RGBC"),
      "Clr ": makeType("", "RGBC"),
      "tintColor": makeType("", "RGBC"),
      Ofst: makeType("", "Pnt "),
      ChFX: makeType("", "ChFX"),
      MpgS: makeType("", "ShpC"),
      DrSh: makeType("", "DrSh"),
      IrSh: makeType("", "IrSh"),
      OrGl: makeType("", "OrGl"),
      IrGl: makeType("", "IrGl"),
      TrnS: makeType("", "ShpC"),
      Ptrn: makeType("", "Ptrn"),
      FrFX: makeType("", "FrFX"),
      phase: makeType("", "Pnt "),
      frameStep: nullType,
      duration: nullType,
      workInTime: nullType,
      workOutTime: nullType,
      audioClipGroupList: nullType,
      bounds: makeType("", "Rctn"),
      customEnvelopeWarp: makeType("", "customEnvelopeWarp"),
      warp: makeType("", "warp"),
      "Sz  ": makeType("", "Pnt "),
      origin: makeType("", "Pnt "),
      autoExpandOffset: makeType("", "Pnt "),
      keyOriginShapeBBox: makeType("", "unitRect"),
      Vrsn: nullType,
      psVersion: nullType,
      docDefaultNewArtboardBackgroundColor: makeType("", "RGBC"),
      artboardRect: makeType("", "classFloatRect"),
      keyOriginRRectRadii: makeType("", "radii"),
      keyOriginBoxCorners: nullType,
      rectangleCornerA: makeType("", "Pnt "),
      rectangleCornerB: makeType("", "Pnt "),
      rectangleCornerC: makeType("", "Pnt "),
      rectangleCornerD: makeType("", "Pnt "),
      compInfo: nullType,
      quiltWarp: makeType("", "quiltWarp"),
      generatorSettings: nullType,
      crema: nullType,
      FrIn: nullType,
      blendOptions: nullType,
      FXRf: nullType,
      Lefx: nullType,
      time: nullType,
      animKey: nullType,
      timeScope: nullType,
      inTime: nullType,
      outTime: nullType,
      sheetStyle: nullType,
      translation: nullType,
      Skew: nullType,
      boundingBox: makeType("", "boundingBox"),
      "Lnk ": makeType("", "ExternalFileLink"),
      frameReader: makeType("", "FrameReader"),
      effectParams: makeType("", "motionTrackEffectParams"),
      Impr: makeType("None", "none"),
      Anch: makeType("", "Pnt "),
      "Fwd ": makeType("", "Pnt "),
      "Bwd ": makeType("", "Pnt "),
      FlrC: makeType("", "Pnt "),
      meshBoundaryPath: makeType("", "pathClass"),
      filterFX: makeType("", "filterFXStyle"),
      Fltr: makeType("", "rigidTransform"),
      FrgC: makeType("", "RGBC"),
      BckC: makeType("", "RGBC"),
      sdwM: makeType("Parameters", "adaptCorrectTones"),
      hglM: makeType("Parameters", "adaptCorrectTones"),
      customShape: makeType("", "customShape"),
      origFXRefPoint: nullType,
      FXRefPoint: nullType,
      ClMg: makeType("", "ClMg")
    };
    var fieldToArrayExtType = {
      "Crv ": makeType("", "CrPt"),
      Clrs: makeType("", "Clrt"),
      Trns: makeType("", "TrnS"),
      keyDescriptorList: nullType,
      solidFillMulti: makeType("", "SoFi"),
      gradientFillMulti: makeType("", "GrFl"),
      dropShadowMulti: makeType("", "DrSh"),
      innerShadowMulti: makeType("", "IrSh"),
      frameFXMulti: makeType("", "FrFX"),
      FrIn: nullType,
      FSts: nullType,
      LaSt: nullType,
      sheetTimelineOptions: nullType,
      trackList: makeType("", "animationTrack"),
      globalTrackList: makeType("", "animationTrack"),
      keyList: nullType,
      audioClipGroupList: nullType,
      audioClipList: nullType,
      countObjectList: makeType("", "countObject"),
      countGroupList: makeType("", "countGroup"),
      slices: makeType("", "slice"),
      "Pts ": makeType("", "Pthp"),
      SbpL: makeType("", "SbpL"),
      pathComponents: makeType("", "PaCm"),
      filterFXList: makeType("", "filterFX"),
      puppetShapeList: makeType("", "puppetShape"),
      channelDenoise: makeType("", "channelDenoiseParams"),
      ShrP: makeType("", "Pnt "),
      layerSettings: nullType,
      list: nullType,
      Adjs: makeType("", "CrvA")
    };
    var typeToField = {
      "TEXT": [
        "Txt ",
        "printerName",
        "Nm  ",
        "Idnt",
        "blackAndWhitePresetFileName",
        "LUT3DFileName",
        "presetFileName",
        "curvesPresetFileName",
        "mixerPresetFileName",
        "placed",
        "description",
        "reason",
        "artboardPresetName",
        "json",
        "clipID",
        "relPath",
        "fullPath",
        "mediaDescriptor",
        "Msge",
        "altTag",
        "url",
        "cellText",
        "preset",
        "KnNm",
        "FPth",
        "comment",
        "originalPath"
      ],
      "tdta": [
        "EngineData",
        "LUT3DFileData",
        "indexArray",
        "originalVertexArray",
        "deformedVertexArray",
        "LqMe"
      ],
      "long": [
        "TextIndex",
        "RndS",
        "Mdpn",
        "Smth",
        "Lctn",
        "strokeStyleVersion",
        "LaID",
        "Vrsn",
        "Cnt ",
        "Brgh",
        "Cntr",
        "means",
        "vibrance",
        "Strt",
        "bwPresetKind",
        "comp",
        "compID",
        "originalCompID",
        "curvesPresetKind",
        "mixerPresetKind",
        "uOrder",
        "vOrder",
        "PgNm",
        "totalPages",
        "Crop",
        "numerator",
        "denominator",
        "frameCount",
        "Annt",
        "keyOriginType",
        "unitValueQuadVersion",
        "keyOriginIndex",
        "major",
        "minor",
        "fix",
        "docDefaultNewArtboardBackgroundType",
        "artboardBackgroundType",
        "numModifyingFX",
        "deformNumRows",
        "deformNumCols",
        "FrID",
        "FrDl",
        "FsID",
        "LCnt",
        "AFrm",
        "AFSt",
        "numBefore",
        "numAfter",
        "Spcn",
        "minOpacity",
        "maxOpacity",
        "BlnM",
        "sheetID",
        "gblA",
        "globalAltitude",
        "descVersion",
        "frameReaderType",
        "LyrI",
        "zoomOrigin",
        "fontSize",
        "Rds ",
        "sliceID",
        "topOutset",
        "leftOutset",
        "bottomOutset",
        "rightOutset",
        "filterID",
        "meshQuality",
        "meshExpansion",
        "meshRigidity",
        "VrsM",
        "VrsN",
        "NmbG",
        "WLMn",
        "WLMx",
        "AmMn",
        "AmMx",
        "SclH",
        "SclV",
        "Lvl ",
        "TlNm",
        "TlOf",
        "FlRs",
        "Thsh",
        "ShrS",
        "ShrE",
        "FlRs",
        "Vrnc",
        "Strg",
        "ExtS",
        "ExtD",
        "HrzS",
        "VrtS",
        "NmbR",
        "EdgF",
        "Ang1",
        "Ang2",
        "Ang3",
        "Ang4",
        "lastAppliedComp",
        "capturedInfo"
      ],
      "enum": [
        "textGridding",
        "Ornt",
        "warpStyle",
        "warpRotate",
        "Inte",
        "Bltn",
        "ClrS",
        "BlrQ",
        "bvlT",
        "bvlS",
        "bvlD",
        "Md  ",
        "glwS",
        "GrdF",
        "GlwT",
        "RplS",
        "BlrM",
        "SmBM",
        "strokeStyleLineCapType",
        "strokeStyleLineJoinType",
        "strokeStyleLineAlignment",
        "strokeStyleBlendMode",
        "PntT",
        "Styl",
        "lookupType",
        "LUTFormat",
        "dataOrder",
        "tableOrder",
        "enableCompCore",
        "enableCompCoreGPU",
        "compCoreSupport",
        "compCoreGPUSupport",
        "Engn",
        "enableCompCoreThreads",
        "gs99",
        "FrDs",
        "trackID",
        "animInterpStyle",
        "horzAlign",
        "vertAlign",
        "bgColorType",
        "shapeOperation",
        "UndA",
        "Wvtp",
        "Drct",
        "WndM",
        "Edg ",
        "FlCl",
        "IntE",
        "IntC",
        "Cnvr",
        "Fl  ",
        "Dstr",
        "MztT",
        "Lns ",
        "ExtT",
        "DspM",
        "ExtR",
        "ZZTy",
        "SphM",
        "SmBQ",
        "placedLayerOCIOConversion",
        "gradientsInterpolationMethod"
      ],
      "bool": [
        "PstS",
        "printSixteenBit",
        "masterFXSwitch",
        "enab",
        "uglg",
        "antialiasGloss",
        "useShape",
        "useTexture",
        "uglg",
        "antialiasGloss",
        "useShape",
        "Vsbl",
        "useTexture",
        "Algn",
        "Rvrs",
        "Dthr",
        "Invr",
        "VctC",
        "ShTr",
        "layerConceals",
        "strokeEnabled",
        "fillEnabled",
        "strokeStyleScaleLock",
        "strokeStyleStrokeAdjust",
        "hardProof",
        "MpBl",
        "paperWhite",
        "useLegacy",
        "Auto",
        "Lab ",
        "useTint",
        "keyShapeInvalidated",
        "autoExpandEnabled",
        "autoNestEnabled",
        "autoPositionEnabled",
        "shrinkwrapOnSaveEnabled",
        "present",
        "showInDialog",
        "overprint",
        "sheetDisclosed",
        "lightsDisclosed",
        "meshesDisclosed",
        "materialsDisclosed",
        "hasMotion",
        "muted",
        "Effc",
        "selected",
        "autoScope",
        "fillCanvas",
        "cellTextIsHTML",
        "Smoo",
        "Clsp",
        "validAtPosition",
        "rigidType",
        "hasoptions",
        "filterMaskEnable",
        "filterMaskLinked",
        "filterMaskExtendWithWhite",
        "removeJPEGArtifact",
        "Mnch",
        "ExtF",
        "ExtM",
        "moreAccurate",
        "GpuY",
        "LIWy",
        "Cnty"
      ],
      "doub": [
        "warpValue",
        "warpPerspective",
        "warpPerspectiveOther",
        "Intr",
        "Wdth",
        "Hght",
        "strokeStyleMiterLimit",
        "strokeStyleResolution",
        "layerTime",
        "keyOriginResolution",
        "xx",
        "xy",
        "yx",
        "yy",
        "tx",
        "ty",
        "FrGA",
        "frameRate",
        "audioLevel",
        "rotation",
        "X   ",
        "Y   ",
        "redFloat",
        "greenFloat",
        "blueFloat",
        "imageResolution",
        "PuX0",
        "PuX1",
        "PuX2",
        "PuX3",
        "PuY0",
        "PuY1",
        "PuY2",
        "PuY3"
      ],
      "UntF": [
        "sdwO",
        "hglO",
        "lagl",
        "Lald",
        "srgR",
        "blur",
        "Sftn",
        "Opct",
        "Dstn",
        "Angl",
        "Ckmt",
        "Nose",
        "Inpr",
        "ShdN",
        "strokeStyleLineWidth",
        "strokeStyleLineDashOffset",
        "strokeStyleOpacity",
        "H   ",
        "Top ",
        "Left",
        "Btom",
        "Rght",
        "Rslt",
        "topRight",
        "topLeft",
        "bottomLeft",
        "bottomRight",
        "ClNs",
        "Shrp"
      ],
      "VlLs": [
        "Crv ",
        "Clrs",
        "Mnm ",
        "Mxm ",
        "Trns",
        "pathList",
        "strokeStyleLineDashSet",
        "FrLs",
        "slices",
        "LaSt",
        "Trnf",
        "nonAffineTransform",
        "keyDescriptorList",
        "guideIndeces",
        "gradientFillMulti",
        "solidFillMulti",
        "frameFXMulti",
        "innerShadowMulti",
        "dropShadowMulti",
        "FrIn",
        "FSts",
        "FsFr",
        "sheetTimelineOptions",
        "audioClipList",
        "trackList",
        "globalTrackList",
        "keyList",
        "audioClipList",
        "warpValues",
        "selectedPin",
        "Pts ",
        "SbpL",
        "pathComponents",
        "pinOffsets",
        "posFinalPins",
        "pinVertexIndices",
        "PinP",
        "PnRt",
        "PnOv",
        "PnDp",
        "filterFXList",
        "puppetShapeList",
        "ShrP",
        "channelDenoise",
        "Mtrx",
        "layerSettings",
        "list",
        "compList",
        "Adjs"
      ],
      "ObAr": ["meshPoints", "quiltSliceX", "quiltSliceY"],
      "obj ": ["null", "Chnl"],
      "Pth ": ["DspF"]
    };
    var channels = [
      "Rd  ",
      "Grn ",
      "Bl  ",
      "Yllw",
      "Ylw ",
      "Cyn ",
      "Mgnt",
      "Blck",
      "Gry ",
      "Lmnc",
      "A   ",
      "B   "
    ];
    var fieldToArrayType = {
      "Mnm ": "long",
      "Mxm ": "long",
      FrLs: "long",
      strokeStyleLineDashSet: "UntF",
      Trnf: "doub",
      nonAffineTransform: "doub",
      keyDescriptorList: "Objc",
      gradientFillMulti: "Objc",
      solidFillMulti: "Objc",
      frameFXMulti: "Objc",
      innerShadowMulti: "Objc",
      dropShadowMulti: "Objc",
      LaSt: "Objc",
      FrIn: "Objc",
      FSts: "Objc",
      FsFr: "long",
      blendOptions: "Objc",
      sheetTimelineOptions: "Objc",
      keyList: "Objc",
      warpValues: "doub",
      selectedPin: "long",
      "Pts ": "Objc",
      SbpL: "Objc",
      pathComponents: "Objc",
      pinOffsets: "doub",
      posFinalPins: "doub",
      pinVertexIndices: "long",
      PinP: "doub",
      PnRt: "long",
      PnOv: "bool",
      PnDp: "doub",
      filterFXList: "Objc",
      puppetShapeList: "Objc",
      ShrP: "Objc",
      channelDenoise: "Objc",
      Mtrx: "long",
      compList: "long",
      Chnl: "enum"
    };
    var fieldToType = {};
    for (const type of Object.keys(typeToField)) {
      for (const field of typeToField[type]) {
        fieldToType[field] = type;
      }
    }
    for (const field of Object.keys(fieldToExtType)) {
      if (!fieldToType[field])
        fieldToType[field] = "Objc";
    }
    for (const field of Object.keys(fieldToArrayExtType)) {
      fieldToArrayType[field] = "Objc";
    }
    function getTypeByKey(key, value, root, parent) {
      if (key === "presetKind") {
        return typeof value === "string" ? "enum" : "long";
      }
      if (key === "null" && root === "slices") {
        return "TEXT";
      } else if (key === "groupID") {
        return root === "slices" ? "long" : "TEXT";
      } else if (key === "Sz  ") {
        return "Wdth" in value ? "Objc" : "units" in value ? "UntF" : "doub";
      } else if (key === "Type") {
        return typeof value === "string" ? "enum" : "long";
      } else if (key === "AntA") {
        return typeof value === "string" ? "enum" : "bool";
      } else if ((key === "Hrzn" || key === "Vrtc") && (parent.Type === "keyType.Pstn" || parent._classID === "Ofst")) {
        return "long";
      } else if (key === "Hrzn" || key === "Vrtc" || key === "Top " || key === "Left" || key === "Btom" || key === "Rght") {
        if (root === "slices")
          return "long";
        return typeof value === "number" ? "doub" : "UntF";
      } else if (key === "Vrsn") {
        return typeof value === "number" ? "long" : "Objc";
      } else if (key === "Rd  " || key === "Grn " || key === "Bl  ") {
        return root === "artd" ? "long" : "doub";
      } else if (key === "Trnf") {
        return Array.isArray(value) ? "VlLs" : "Objc";
      } else {
        return fieldToType[key];
      }
    }
    function readAsciiStringOrClassId(reader) {
      const length = (0, psdReader_1.readInt32)(reader);
      return (0, psdReader_1.readAsciiString)(reader, length || 4);
    }
    function writeAsciiStringOrClassId(writer, value) {
      if (value.length === 4 && value !== "warp" && value !== "time" && value !== "hold" && value !== "list") {
        (0, psdWriter_1.writeInt32)(writer, 0);
        (0, psdWriter_1.writeSignature)(writer, value);
      } else {
        (0, psdWriter_1.writeInt32)(writer, value.length);
        for (let i2 = 0; i2 < value.length; i2++) {
          (0, psdWriter_1.writeUint8)(writer, value.charCodeAt(i2));
        }
      }
    }
    function readDescriptorStructure(reader, includeClass) {
      const struct = readClassStructure(reader);
      const object = includeClass ? { _name: struct.name, _classID: struct.classID } : {};
      const itemsCount = (0, psdReader_1.readUint32)(reader);
      for (let i2 = 0; i2 < itemsCount; i2++) {
        const key = readAsciiStringOrClassId(reader);
        const type = (0, psdReader_1.readSignature)(reader);
        const data = readOSType(reader, type, includeClass);
        object[key] = data;
      }
      return object;
    }
    function writeDescriptorStructure(writer, name, classId, value, root) {
      if (logErrors && !classId)
        console.log("Missing classId for: ", name, classId, value);
      (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, name);
      writeAsciiStringOrClassId(writer, classId);
      const keys = Object.keys(value);
      let keyCount = keys.length;
      if ("_name" in value)
        keyCount--;
      if ("_classID" in value)
        keyCount--;
      (0, psdWriter_1.writeUint32)(writer, keyCount);
      for (const key of keys) {
        if (key === "_name" || key === "_classID")
          continue;
        let type = getTypeByKey(key, value[key], root, value);
        let extType = fieldToExtType[key];
        if (key === "bounds" && root === "text") {
          extType = makeType("", "bounds");
        } else if (key === "origin") {
          type = root === "slices" ? "enum" : "Objc";
        } else if ((key === "Cyn " || key === "Mgnt" || key === "Ylw " || key === "Blck") && value._classID === "CMYC") {
          type = "doub";
        } else if (/^PN[a-z][a-z]$/.test(key)) {
          type = "TEXT";
        } else if (/^PT[a-z][a-z]$/.test(key)) {
          type = "long";
        } else if (/^PF[a-z][a-z]$/.test(key)) {
          type = "doub";
        } else if ((key === "Rds " || key === "Thsh") && typeof value[key] === "number" && value._classID === "SmrB") {
          type = "doub";
        } else if (key === "ClSz" || key === "Rds " || key === "Amnt") {
          type = typeof value[key] === "number" ? "long" : "UntF";
        } else if ((key === "sdwM" || key === "hglM") && typeof value[key] === "string") {
          type = "enum";
        } else if (key === "blur" && typeof value[key] === "string") {
          type = "enum";
        } else if (key === "Hght" && typeof value[key] === "number" && value._classID === "Embs") {
          type = "long";
        } else if (key === "Angl" && typeof value[key] === "number" && (value._classID === "Embs" || value._classID === "smartSharpen" || value._classID === "Twrl" || value._classID === "MtnB")) {
          type = "long";
        } else if (key === "Angl" && typeof value[key] === "number") {
          type = "doub";
        } else if (key === "bounds" && root === "slices") {
          type = "Objc";
          extType = makeType("", "Rct1");
        } else if (key === "Scl ") {
          if (typeof value[key] === "object" && "Hrzn" in value[key]) {
            type = "Objc";
            extType = nullType;
          } else if (typeof value[key] === "number") {
            type = "long";
          } else {
            type = "UntF";
          }
        } else if (key === "audioClipGroupList" && keys.length === 1) {
          type = "VlLs";
        } else if ((key === "Strt" || key === "Brgh") && "H   " in value) {
          type = "doub";
        } else if (key === "Wdth" && typeof value[key] === "object") {
          type = "UntF";
        } else if (key === "Ofst" && typeof value[key] === "number") {
          type = "long";
        } else if (key === "Strt" && typeof value[key] === "object") {
          type = "Objc";
          extType = nullType;
        } else if (channels.indexOf(key) !== -1) {
          type = classId === "RGBC" && root !== "artd" ? "doub" : "long";
        } else if (key === "profile") {
          type = classId === "printOutput" ? "TEXT" : "tdta";
        } else if (key === "strokeStyleContent") {
          if (value[key]["Clr "]) {
            extType = makeType("", "solidColorLayer");
          } else if (value[key].Grad) {
            extType = makeType("", "gradientLayer");
          } else if (value[key].Ptrn) {
            extType = makeType("", "patternLayer");
          } else {
            logErrors && console.log("Invalid strokeStyleContent value", value[key]);
          }
        } else if (key === "bounds" && root === "quiltWarp") {
          extType = makeType("", "classFloatRect");
        }
        if (extType && extType.classID === "RGBC") {
          if ("H   " in value[key])
            extType = { classID: "HSBC", name: "" };
        }
        writeAsciiStringOrClassId(writer, key);
        (0, psdWriter_1.writeSignature)(writer, type || "long");
        writeOSType(writer, type || "long", value[key], key, extType, root);
        if (logErrors && !type)
          console.log(`Missing descriptor field type for: '${key}' in`, value);
      }
    }
    function readOSType(reader, type, includeClass) {
      switch (type) {
        case "obj ":
          return readReferenceStructure(reader);
        case "Objc":
        // Descriptor
        case "GlbO":
          return readDescriptorStructure(reader, includeClass);
        case "VlLs": {
          const length = (0, psdReader_1.readInt32)(reader);
          const items = [];
          for (let i2 = 0; i2 < length; i2++) {
            const itemType = (0, psdReader_1.readSignature)(reader);
            items.push(readOSType(reader, itemType, includeClass));
          }
          return items;
        }
        case "doub":
          return (0, psdReader_1.readFloat64)(reader);
        case "UntF": {
          const units = (0, psdReader_1.readSignature)(reader);
          const value = (0, psdReader_1.readFloat64)(reader);
          if (!unitsMap[units])
            throw new Error(`Invalid units: ${units}`);
          return { units: unitsMap[units], value };
        }
        case "UnFl": {
          const units = (0, psdReader_1.readSignature)(reader);
          const value = (0, psdReader_1.readFloat32)(reader);
          if (!unitsMap[units])
            throw new Error(`Invalid units: ${units}`);
          return { units: unitsMap[units], value };
        }
        case "TEXT":
          return (0, psdReader_1.readUnicodeString)(reader);
        case "enum": {
          const enumType = readAsciiStringOrClassId(reader);
          const value = readAsciiStringOrClassId(reader);
          return `${enumType}.${value}`;
        }
        case "long":
          return (0, psdReader_1.readInt32)(reader);
        case "comp": {
          const low = (0, psdReader_1.readUint32)(reader);
          const high = (0, psdReader_1.readUint32)(reader);
          return { low, high };
        }
        case "bool":
          return !!(0, psdReader_1.readUint8)(reader);
        case "type":
        // Class
        case "GlbC":
          return readClassStructure(reader);
        case "alis": {
          const length = (0, psdReader_1.readInt32)(reader);
          return (0, psdReader_1.readAsciiString)(reader, length);
        }
        case "tdta": {
          const length = (0, psdReader_1.readInt32)(reader);
          return (0, psdReader_1.readBytes)(reader, length);
        }
        case "ObAr": {
          (0, psdReader_1.readInt32)(reader);
          (0, psdReader_1.readUnicodeString)(reader);
          readAsciiStringOrClassId(reader);
          const length = (0, psdReader_1.readInt32)(reader);
          const items = [];
          for (let i2 = 0; i2 < length; i2++) {
            const type1 = readAsciiStringOrClassId(reader);
            (0, psdReader_1.readSignature)(reader);
            (0, psdReader_1.readSignature)(reader);
            const valuesCount = (0, psdReader_1.readInt32)(reader);
            const values = [];
            for (let j = 0; j < valuesCount; j++) {
              values.push((0, psdReader_1.readFloat64)(reader));
            }
            items.push({ type: type1, values });
          }
          return items;
        }
        case "Pth ": {
          (0, psdReader_1.readInt32)(reader);
          const sig = (0, psdReader_1.readSignature)(reader);
          (0, psdReader_1.readInt32LE)(reader);
          const charsCount = (0, psdReader_1.readInt32LE)(reader);
          const path = (0, psdReader_1.readUnicodeStringWithLengthLE)(reader, charsCount);
          return { sig, path };
        }
        default:
          throw new Error(`Invalid TySh descriptor OSType: ${type} at ${reader.offset.toString(16)}`);
      }
    }
    var ObArTypes = {
      meshPoints: "rationalPoint",
      quiltSliceX: "UntF",
      quiltSliceY: "UntF"
    };
    function writeOSType(writer, type, value, key, extType, root) {
      switch (type) {
        case "obj ":
          writeReferenceStructure(writer, key, value);
          break;
        case "Objc":
        // Descriptor
        case "GlbO": {
          if (typeof value !== "object")
            throw new Error(`Invalid struct value: ${JSON.stringify(value)}, key: ${key}`);
          if (!extType)
            throw new Error(`Missing ext type for: '${key}' (${JSON.stringify(value)})`);
          const name = value._name || extType.name;
          const classID = value._classID || extType.classID;
          writeDescriptorStructure(writer, name, classID, value, root);
          break;
        }
        case "VlLs":
          if (!Array.isArray(value))
            throw new Error(`Invalid list value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeInt32)(writer, value.length);
          for (let i2 = 0; i2 < value.length; i2++) {
            const type2 = fieldToArrayType[key];
            (0, psdWriter_1.writeSignature)(writer, type2 || "long");
            writeOSType(writer, type2 || "long", value[i2], `${key}[]`, fieldToArrayExtType[key], root);
            if (logErrors && !type2)
              console.log(`Missing descriptor array type for: '${key}' in`, value);
          }
          break;
        case "doub":
          if (typeof value !== "number")
            throw new Error(`Invalid number value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeFloat64)(writer, value);
          break;
        case "UntF":
          if (!unitsMapRev[value.units])
            throw new Error(`Invalid units: ${value.units} in ${key}`);
          (0, psdWriter_1.writeSignature)(writer, unitsMapRev[value.units]);
          (0, psdWriter_1.writeFloat64)(writer, value.value);
          break;
        case "UnFl":
          if (!unitsMapRev[value.units])
            throw new Error(`Invalid units: ${value.units} in ${key}`);
          (0, psdWriter_1.writeSignature)(writer, unitsMapRev[value.units]);
          (0, psdWriter_1.writeFloat32)(writer, value.value);
          break;
        case "TEXT":
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, value);
          break;
        case "enum": {
          if (typeof value !== "string")
            throw new Error(`Invalid enum value: ${JSON.stringify(value)}, key: ${key}`);
          const [_type, val] = value.split(".");
          writeAsciiStringOrClassId(writer, _type);
          writeAsciiStringOrClassId(writer, val);
          break;
        }
        case "long":
          if (typeof value !== "number")
            throw new Error(`Invalid integer value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeInt32)(writer, value);
          break;
        // case 'comp': // Large Integer
        // 	writeLargeInteger(reader);
        case "bool":
          if (typeof value !== "boolean")
            throw new Error(`Invalid boolean value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeUint8)(writer, value ? 1 : 0);
          break;
        // case 'type': // Class
        // case 'GlbC': // Class
        // 	writeClassStructure(reader);
        // case 'alis': // Alias
        // 	writeAliasStructure(reader);
        case "tdta":
          (0, psdWriter_1.writeInt32)(writer, value.byteLength);
          (0, psdWriter_1.writeBytes)(writer, value);
          break;
        case "ObAr": {
          (0, psdWriter_1.writeInt32)(writer, 16);
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, "");
          const type2 = ObArTypes[key];
          if (!type2)
            throw new Error(`Not implemented ObArType for: ${key}`);
          writeAsciiStringOrClassId(writer, type2);
          (0, psdWriter_1.writeInt32)(writer, value.length);
          for (let i2 = 0; i2 < value.length; i2++) {
            writeAsciiStringOrClassId(writer, value[i2].type);
            (0, psdWriter_1.writeSignature)(writer, "UnFl");
            (0, psdWriter_1.writeSignature)(writer, "#Pxl");
            (0, psdWriter_1.writeInt32)(writer, value[i2].values.length);
            for (let j = 0; j < value[i2].values.length; j++) {
              (0, psdWriter_1.writeFloat64)(writer, value[i2].values[j]);
            }
          }
          break;
        }
        case "Pth ": {
          const length = 4 + 4 + 4 + value.path.length * 2;
          (0, psdWriter_1.writeInt32)(writer, length);
          (0, psdWriter_1.writeSignature)(writer, value.sig);
          (0, psdWriter_1.writeInt32LE)(writer, length);
          (0, psdWriter_1.writeInt32LE)(writer, value.path.length);
          (0, psdWriter_1.writeUnicodeStringWithoutLengthLE)(writer, value.path);
          break;
        }
        default:
          throw new Error(`Not implemented descriptor OSType: ${type}`);
      }
    }
    function readReferenceStructure(reader) {
      const itemsCount = (0, psdReader_1.readInt32)(reader);
      const items = [];
      for (let i2 = 0; i2 < itemsCount; i2++) {
        const type = (0, psdReader_1.readSignature)(reader);
        switch (type) {
          case "prop": {
            readClassStructure(reader);
            const keyID = readAsciiStringOrClassId(reader);
            items.push(keyID);
            break;
          }
          case "Clss":
            items.push(readClassStructure(reader));
            break;
          case "Enmr": {
            readClassStructure(reader);
            const typeID = readAsciiStringOrClassId(reader);
            const value = readAsciiStringOrClassId(reader);
            items.push(`${typeID}.${value}`);
            break;
          }
          case "rele": {
            readClassStructure(reader);
            items.push((0, psdReader_1.readUint32)(reader));
            break;
          }
          case "Idnt":
            items.push((0, psdReader_1.readInt32)(reader));
            break;
          case "indx":
            items.push((0, psdReader_1.readInt32)(reader));
            break;
          case "name": {
            readClassStructure(reader);
            items.push((0, psdReader_1.readUnicodeString)(reader));
            break;
          }
          default:
            throw new Error(`Invalid descriptor reference type: ${type}`);
        }
      }
      return items;
    }
    function writeReferenceStructure(writer, _key, items) {
      (0, psdWriter_1.writeInt32)(writer, items.length);
      for (let i2 = 0; i2 < items.length; i2++) {
        const value = items[i2];
        let type = "unknown";
        if (typeof value === "string") {
          if (/^[a-z ]+\.[a-z ]+$/i.test(value)) {
            type = "Enmr";
          } else {
            type = "name";
          }
        }
        (0, psdWriter_1.writeSignature)(writer, type);
        switch (type) {
          // case 'prop': // Property
          // case 'Clss': // Class
          case "Enmr": {
            const [typeID, enumValue] = value.split(".");
            writeClassStructure(writer, "\0", typeID);
            writeAsciiStringOrClassId(writer, typeID);
            writeAsciiStringOrClassId(writer, enumValue);
            break;
          }
          // case 'rele': // Offset
          // case 'Idnt': // Identifier
          // case 'indx': // Index
          case "name": {
            writeClassStructure(writer, "\0", "Lyr ");
            (0, psdWriter_1.writeUnicodeString)(writer, value + "\0");
            break;
          }
          default:
            throw new Error(`Invalid descriptor reference type: ${type}`);
        }
      }
      return items;
    }
    function readClassStructure(reader) {
      const name = (0, psdReader_1.readUnicodeString)(reader);
      const classID = readAsciiStringOrClassId(reader);
      return { name, classID };
    }
    function writeClassStructure(writer, name, classID) {
      (0, psdWriter_1.writeUnicodeString)(writer, name);
      writeAsciiStringOrClassId(writer, classID);
    }
    function readVersionAndDescriptor(reader, includeClass = false) {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 16)
        throw new Error(`Invalid descriptor version: ${version}`);
      const desc = readDescriptorStructure(reader, includeClass);
      return desc;
    }
    function writeVersionAndDescriptor(writer, name, classID, descriptor, root = "") {
      (0, psdWriter_1.writeUint32)(writer, 16);
      writeDescriptorStructure(writer, name, classID, descriptor, root);
    }
    function horzVrtcToXY(hv) {
      return { x: hv.Hrzn, y: hv.Vrtc };
    }
    function xyToHorzVrtc(xy) {
      return { Hrzn: xy.x, Vrtc: xy.y };
    }
    function descBoundsToBounds(desc) {
      return {
        top: parseUnits(desc["Top "]),
        left: parseUnits(desc.Left),
        right: parseUnits(desc.Rght),
        bottom: parseUnits(desc.Btom)
      };
    }
    function boundsToDescBounds(bounds) {
      return {
        Left: unitsValue(bounds.left, "bounds.left"),
        ["Top "]: unitsValue(bounds.top, "bounds.top"),
        Rght: unitsValue(bounds.right, "bounds.right"),
        Btom: unitsValue(bounds.bottom, "bounds.bottom")
      };
    }
    function parseFxObject(fx) {
      const stroke = {
        enabled: !!fx.enab,
        position: exports.FStl.decode(fx.Styl),
        fillType: exports.FrFl.decode(fx.PntT),
        blendMode: exports.BlnM.decode(fx["Md  "]),
        opacity: parsePercent(fx.Opct),
        size: parseUnits(fx["Sz  "])
      };
      if (fx.present !== void 0)
        stroke.present = fx.present;
      if (fx.showInDialog !== void 0)
        stroke.showInDialog = fx.showInDialog;
      if (fx.overprint !== void 0)
        stroke.overprint = fx.overprint;
      if (fx["Clr "])
        stroke.color = parseColor(fx["Clr "]);
      if (fx.Grad)
        stroke.gradient = parseGradientContent(fx);
      if (fx.Ptrn)
        stroke.pattern = parsePatternContent(fx);
      return stroke;
    }
    function serializeFxObject(stroke) {
      let FrFX = {};
      FrFX.enab = !!stroke.enabled;
      if (stroke.present !== void 0)
        FrFX.present = !!stroke.present;
      if (stroke.showInDialog !== void 0)
        FrFX.showInDialog = !!stroke.showInDialog;
      FrFX.Styl = exports.FStl.encode(stroke.position);
      FrFX.PntT = exports.FrFl.encode(stroke.fillType);
      FrFX["Md  "] = exports.BlnM.encode(stroke.blendMode);
      FrFX.Opct = unitsPercent(stroke.opacity);
      FrFX["Sz  "] = unitsValue(stroke.size, "size");
      if (stroke.color)
        FrFX["Clr "] = serializeColor(stroke.color);
      if (stroke.gradient)
        FrFX = Object.assign(Object.assign({}, FrFX), serializeGradientContent(stroke.gradient));
      if (stroke.pattern)
        FrFX = Object.assign(Object.assign({}, FrFX), serializePatternContent(stroke.pattern));
      if (stroke.overprint !== void 0)
        FrFX.overprint = !!stroke.overprint;
      return FrFX;
    }
    function serializeEffects(e, log, multi) {
      var _a2, _b2, _c;
      const info = multi ? {
        "Scl ": unitsPercentF((_a2 = e.scale) !== null && _a2 !== void 0 ? _a2 : 1),
        masterFXSwitch: !e.disabled
      } : {
        masterFXSwitch: !e.disabled,
        "Scl ": unitsPercentF((_b2 = e.scale) !== null && _b2 !== void 0 ? _b2 : 1)
      };
      const arrayKeys = ["dropShadow", "innerShadow", "solidFill", "gradientOverlay", "stroke"];
      for (const key of arrayKeys) {
        if (e[key] && !Array.isArray(e[key]))
          throw new Error(`${key} should be an array`);
      }
      const useMulti = (arr) => !!arr && arr.length > 1 && multi;
      const useSingle = (arr) => !!arr && arr.length >= 1 && (!multi || arr.length === 1);
      if (useSingle(e.dropShadow))
        info.DrSh = serializeEffectObject(e.dropShadow[0], "dropShadow", log);
      if (useMulti(e.dropShadow))
        info.dropShadowMulti = e.dropShadow.map((i2) => serializeEffectObject(i2, "dropShadow", log));
      if (useSingle(e.innerShadow))
        info.IrSh = serializeEffectObject(e.innerShadow[0], "innerShadow", log);
      if (useMulti(e.innerShadow))
        info.innerShadowMulti = e.innerShadow.map((i2) => serializeEffectObject(i2, "innerShadow", log));
      if (e.outerGlow)
        info.OrGl = serializeEffectObject(e.outerGlow, "outerGlow", log);
      if (useMulti(e.solidFill))
        info.solidFillMulti = e.solidFill.map((i2) => serializeEffectObject(i2, "solidFill", log));
      if (useMulti(e.gradientOverlay))
        info.gradientFillMulti = e.gradientOverlay.map((i2) => serializeEffectObject(i2, "gradientOverlay", log));
      if (useMulti(e.stroke))
        info.frameFXMulti = e.stroke.map((i2) => serializeFxObject(i2));
      if (e.innerGlow)
        info.IrGl = serializeEffectObject(e.innerGlow, "innerGlow", log);
      if (e.bevel)
        info.ebbl = serializeEffectObject(e.bevel, "bevel", log);
      if (useSingle(e.solidFill))
        info.SoFi = serializeEffectObject(e.solidFill[0], "solidFill", log);
      if (e.patternOverlay)
        info.patternFill = serializeEffectObject(e.patternOverlay, "patternOverlay", log);
      if (useSingle(e.gradientOverlay))
        info.GrFl = serializeEffectObject(e.gradientOverlay[0], "gradientOverlay", log);
      if (e.satin)
        info.ChFX = serializeEffectObject(e.satin, "satin", log);
      if (useSingle(e.stroke))
        info.FrFX = serializeFxObject((_c = e.stroke) === null || _c === void 0 ? void 0 : _c[0]);
      if (multi) {
        info.numModifyingFX = 0;
        for (const key of Object.keys(e)) {
          const value = e[key];
          if (Array.isArray(value)) {
            for (const effect of value) {
              if (effect.enabled)
                info.numModifyingFX++;
            }
          } else if (value.enabled) {
            info.numModifyingFX++;
          }
        }
      }
      return info;
    }
    function parseEffects(info, log) {
      const effects = {};
      const { masterFXSwitch, DrSh, dropShadowMulti, IrSh, innerShadowMulti, OrGl, IrGl, ebbl, SoFi, solidFillMulti, patternFill, GrFl, gradientFillMulti, ChFX, FrFX, frameFXMulti, numModifyingFX } = info, rest = __rest(info, ["masterFXSwitch", "DrSh", "dropShadowMulti", "IrSh", "innerShadowMulti", "OrGl", "IrGl", "ebbl", "SoFi", "solidFillMulti", "patternFill", "GrFl", "gradientFillMulti", "ChFX", "FrFX", "frameFXMulti", "numModifyingFX"]);
      if (!masterFXSwitch)
        effects.disabled = true;
      if (info["Scl "])
        effects.scale = parsePercent(info["Scl "]);
      if (DrSh)
        effects.dropShadow = [parseEffectObject(DrSh, log)];
      if (dropShadowMulti)
        effects.dropShadow = dropShadowMulti.map((i2) => parseEffectObject(i2, log));
      if (IrSh)
        effects.innerShadow = [parseEffectObject(IrSh, log)];
      if (innerShadowMulti)
        effects.innerShadow = innerShadowMulti.map((i2) => parseEffectObject(i2, log));
      if (OrGl)
        effects.outerGlow = parseEffectObject(OrGl, log);
      if (IrGl)
        effects.innerGlow = parseEffectObject(IrGl, log);
      if (ebbl)
        effects.bevel = parseEffectObject(ebbl, log);
      if (SoFi)
        effects.solidFill = [parseEffectObject(SoFi, log)];
      if (solidFillMulti)
        effects.solidFill = solidFillMulti.map((i2) => parseEffectObject(i2, log));
      if (patternFill)
        effects.patternOverlay = parseEffectObject(patternFill, log);
      if (GrFl)
        effects.gradientOverlay = [parseEffectObject(GrFl, log)];
      if (gradientFillMulti)
        effects.gradientOverlay = gradientFillMulti.map((i2) => parseEffectObject(i2, log));
      if (ChFX)
        effects.satin = parseEffectObject(ChFX, log);
      if (FrFX)
        effects.stroke = [parseFxObject(FrFX)];
      if (frameFXMulti)
        effects.stroke = frameFXMulti.map((i2) => parseFxObject(i2));
      if (log && Object.keys(rest).length > 1)
        console.log("Unhandled effect keys:", rest);
      return effects;
    }
    function parseKeyList(keyList, logMissingFeatures) {
      const keys = [];
      for (let j = 0; j < keyList.length; j++) {
        const key = keyList[j];
        const { time: { denominator, numerator }, selected, animKey } = key;
        const time = { numerator, denominator };
        const interpolation = exports.animInterpStyleEnum.decode(key.animInterpStyle);
        switch (animKey.Type) {
          case "keyType.Opct":
            keys.push({ interpolation, time, selected, type: "opacity", value: parsePercent(animKey.Opct) });
            break;
          case "keyType.Pstn":
            keys.push({ interpolation, time, selected, type: "position", x: animKey.Hrzn, y: animKey.Vrtc });
            break;
          case "keyType.Trnf":
            keys.push({
              interpolation,
              time,
              selected,
              type: "transform",
              scale: horzVrtcToXY(animKey["Scl "]),
              skew: horzVrtcToXY(animKey.Skew),
              rotation: animKey.rotation,
              translation: horzVrtcToXY(animKey.translation)
            });
            break;
          case "keyType.sheetStyle": {
            const key2 = { interpolation, time, selected, type: "style" };
            if (animKey.sheetStyle.Lefx)
              key2.style = parseEffects(animKey.sheetStyle.Lefx, logMissingFeatures);
            keys.push(key2);
            break;
          }
          case "keyType.globalLighting": {
            keys.push({
              interpolation,
              time,
              selected,
              type: "globalLighting",
              globalAngle: animKey.gblA,
              globalAltitude: animKey.globalAltitude
            });
            break;
          }
          default:
            throw new Error(`Unsupported keyType value`);
        }
      }
      return keys;
    }
    function serializeKeyList(keys) {
      const keyList = [];
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const { time, selected = false, interpolation } = key;
        const animInterpStyle = exports.animInterpStyleEnum.encode(interpolation);
        let animKey;
        switch (key.type) {
          case "opacity":
            animKey = { Type: "keyType.Opct", Opct: unitsPercent(key.value) };
            break;
          case "position":
            animKey = { Type: "keyType.Pstn", Hrzn: key.x, Vrtc: key.y };
            break;
          case "transform":
            animKey = { Type: "keyType.Trnf", "Scl ": xyToHorzVrtc(key.scale), Skew: xyToHorzVrtc(key.skew), rotation: key.rotation, translation: xyToHorzVrtc(key.translation) };
            break;
          case "style":
            animKey = { Type: "keyType.sheetStyle", sheetStyle: { Vrsn: 1, blendOptions: {} } };
            if (key.style)
              animKey.sheetStyle = { Vrsn: 1, Lefx: serializeEffects(key.style, false, false), blendOptions: {} };
            break;
          case "globalLighting": {
            animKey = { Type: "keyType.globalLighting", gblA: key.globalAngle, globalAltitude: key.globalAltitude };
            break;
          }
          default:
            throw new Error(`Unsupported keyType value`);
        }
        keyList.push({ Vrsn: 1, animInterpStyle, time, animKey, selected });
      }
      return keyList;
    }
    function parseTrackList(trackList, logMissingFeatures) {
      const tracks = [];
      for (let i2 = 0; i2 < trackList.length; i2++) {
        const tr = trackList[i2];
        const track = {
          type: exports.stdTrackID.decode(tr.trackID),
          enabled: tr.enab,
          keys: parseKeyList(tr.keyList, logMissingFeatures)
        };
        if (tr.effectParams) {
          track.effectParams = {
            fillCanvas: tr.effectParams.fillCanvas,
            zoomOrigin: tr.effectParams.zoomOrigin,
            keys: parseKeyList(tr.effectParams.keyList, logMissingFeatures)
          };
        }
        tracks.push(track);
      }
      return tracks;
    }
    function serializeTrackList(tracks) {
      const trackList = [];
      for (let i2 = 0; i2 < tracks.length; i2++) {
        const t = tracks[i2];
        trackList.push(Object.assign(Object.assign({ trackID: exports.stdTrackID.encode(t.type), Vrsn: 1, enab: !!t.enabled, Effc: !!t.effectParams }, t.effectParams ? {
          effectParams: {
            keyList: serializeKeyList(t.keys),
            fillCanvas: t.effectParams.fillCanvas,
            zoomOrigin: t.effectParams.zoomOrigin
          }
        } : {}), { keyList: serializeKeyList(t.keys) }));
      }
      return trackList;
    }
    function parseEffectObject(obj, reportErrors) {
      const result = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        switch (key) {
          case "enab":
            result.enabled = !!val;
            break;
          case "uglg":
            result.useGlobalLight = !!val;
            break;
          case "AntA":
            result.antialiased = !!val;
            break;
          case "Algn":
            result.align = !!val;
            break;
          case "Dthr":
            result.dither = !!val;
            break;
          case "Invr":
            result.invert = !!val;
            break;
          case "Rvrs":
            result.reverse = !!val;
            break;
          case "Clr ":
            result.color = parseColor(val);
            break;
          case "hglC":
            result.highlightColor = parseColor(val);
            break;
          case "sdwC":
            result.shadowColor = parseColor(val);
            break;
          case "Styl":
            result.position = exports.FStl.decode(val);
            break;
          case "Md  ":
            result.blendMode = exports.BlnM.decode(val);
            break;
          case "hglM":
            result.highlightBlendMode = exports.BlnM.decode(val);
            break;
          case "sdwM":
            result.shadowBlendMode = exports.BlnM.decode(val);
            break;
          case "bvlS":
            result.style = exports.BESl.decode(val);
            break;
          case "bvlD":
            result.direction = exports.BESs.decode(val);
            break;
          case "bvlT":
            result.technique = exports.bvlT.decode(val);
            break;
          case "GlwT":
            result.technique = exports.BETE.decode(val);
            break;
          case "glwS":
            result.source = exports.IGSr.decode(val);
            break;
          case "Type":
            result.type = exports.GrdT.decode(val);
            break;
          case "gs99":
            result.interpolationMethod = exports.gradientInterpolationMethodType.decode(val);
            break;
          case "Opct":
            result.opacity = parsePercent(val);
            break;
          case "hglO":
            result.highlightOpacity = parsePercent(val);
            break;
          case "sdwO":
            result.shadowOpacity = parsePercent(val);
            break;
          case "lagl":
            result.angle = parseAngle(val);
            break;
          case "Angl":
            result.angle = parseAngle(val);
            break;
          case "Lald":
            result.altitude = parseAngle(val);
            break;
          case "Sftn":
            result.soften = parseUnits(val);
            break;
          case "srgR":
            result.strength = parsePercent(val);
            break;
          case "blur":
            result.size = parseUnits(val);
            break;
          case "Nose":
            result.noise = parsePercent(val);
            break;
          case "Inpr":
            result.range = parsePercent(val);
            break;
          case "Ckmt":
            result.choke = parseUnits(val);
            break;
          case "ShdN":
            result.jitter = parsePercent(val);
            break;
          case "Dstn":
            result.distance = parseUnits(val);
            break;
          case "Scl ":
            result.scale = parsePercent(val);
            break;
          case "Ptrn":
            result.pattern = { name: val["Nm  "], id: val.Idnt };
            break;
          case "phase":
            result.phase = { x: val.Hrzn, y: val.Vrtc };
            break;
          case "Ofst":
            result.offset = { x: parsePercent(val.Hrzn), y: parsePercent(val.Vrtc) };
            break;
          case "MpgS":
          case "TrnS":
            result.contour = {
              name: val["Nm  "],
              curve: val["Crv "].map((p) => ({ x: p.Hrzn, y: p.Vrtc }))
            };
            break;
          case "Grad":
            result.gradient = parseGradient(val);
            break;
          case "useTexture":
          case "useShape":
          case "layerConceals":
          case "present":
          case "showInDialog":
          case "antialiasGloss":
            result[key] = val;
            break;
          case "_name":
          case "_classID":
            break;
          default:
            reportErrors && console.log(`Invalid effect key: '${key}', value:`, val);
        }
      }
      return result;
    }
    function serializeEffectObject(obj, objName, reportErrors) {
      const result = {
        enab: false
      };
      if (objName === "dropShadow") {
        result.TrnS = { "Nm  ": "", "Crv ": [] };
      }
      for (const objKey of Object.keys(obj)) {
        const key = objKey;
        const val = obj[key];
        switch (key) {
          case "enabled":
            result.enab = !!val;
            break;
          case "useGlobalLight":
            result.uglg = !!val;
            break;
          case "antialiased":
            result.AntA = !!val;
            break;
          case "align":
            result.Algn = !!val;
            break;
          case "dither":
            result.Dthr = !!val;
            break;
          case "invert":
            result.Invr = !!val;
            break;
          case "reverse":
            result.Rvrs = !!val;
            break;
          case "color":
            result["Clr "] = serializeColor(val);
            break;
          case "highlightColor":
            result.hglC = serializeColor(val);
            break;
          case "shadowColor":
            result.sdwC = serializeColor(val);
            break;
          case "position":
            result.Styl = exports.FStl.encode(val);
            break;
          case "blendMode":
            result["Md  "] = exports.BlnM.encode(val);
            break;
          case "highlightBlendMode":
            result.hglM = exports.BlnM.encode(val);
            break;
          case "shadowBlendMode":
            result.sdwM = exports.BlnM.encode(val);
            break;
          case "style":
            result.bvlS = exports.BESl.encode(val);
            break;
          case "direction":
            result.bvlD = exports.BESs.encode(val);
            break;
          case "technique":
            if (objName === "bevel") {
              result.bvlT = exports.bvlT.encode(val);
            } else {
              result.GlwT = exports.BETE.encode(val);
            }
            break;
          case "source":
            result.glwS = exports.IGSr.encode(val);
            break;
          case "type":
            result.Type = exports.GrdT.encode(val);
            break;
          case "interpolationMethod":
            result.gs99 = exports.gradientInterpolationMethodType.encode(val);
            break;
          case "opacity":
            result.Opct = unitsPercent(val);
            break;
          case "highlightOpacity":
            result.hglO = unitsPercent(val);
            break;
          case "shadowOpacity":
            result.sdwO = unitsPercent(val);
            break;
          case "angle":
            if (objName === "gradientOverlay" || objName === "patternFill") {
              result.Angl = unitsAngle(val);
            } else {
              result.lagl = unitsAngle(val);
            }
            break;
          case "altitude":
            result.Lald = unitsAngle(val);
            break;
          case "soften":
            result.Sftn = unitsValue(val, key);
            break;
          case "strength":
            result.srgR = unitsPercent(val);
            break;
          case "size":
            result.blur = unitsValue(val, key);
            break;
          case "noise":
            result.Nose = unitsPercent(val);
            break;
          case "range":
            result.Inpr = unitsPercent(val);
            break;
          case "choke":
            result.Ckmt = unitsValue(val, key);
            break;
          case "jitter":
            result.ShdN = unitsPercent(val);
            break;
          case "distance":
            result.Dstn = unitsValue(val, key);
            break;
          case "scale":
            result["Scl "] = unitsPercent(val);
            break;
          case "pattern":
            result.Ptrn = { "Nm  ": val.name, Idnt: val.id };
            break;
          case "phase":
            result.phase = { Hrzn: val.x, Vrtc: val.y };
            break;
          case "offset":
            result.Ofst = { Hrzn: unitsPercent(val.x), Vrtc: unitsPercent(val.y) };
            break;
          case "contour": {
            result[objName === "satin" ? "MpgS" : "TrnS"] = {
              "Nm  ": val.name,
              "Crv ": val.curve.map((p) => ({ Hrzn: p.x, Vrtc: p.y }))
            };
            break;
          }
          case "gradient":
            result.Grad = serializeGradient(val);
            break;
          case "useTexture":
          case "useShape":
          case "layerConceals":
          case "present":
          case "showInDialog":
          case "antialiasGloss":
            result[key] = val;
            break;
          default:
            reportErrors && console.log(`Invalid effect key: '${key}', value:`, val);
        }
      }
      return result;
    }
    function parseGradient(grad) {
      if (grad.GrdF === "GrdF.CstS") {
        const samples = grad.Intr || 4096;
        return {
          type: "solid",
          name: grad["Nm  "],
          smoothness: grad.Intr / 4096,
          colorStops: grad.Clrs.map((s) => ({
            color: parseColor(s["Clr "]),
            location: s.Lctn / samples,
            midpoint: s.Mdpn / 100
          })),
          opacityStops: grad.Trns.map((s) => ({
            opacity: parsePercent(s.Opct),
            location: s.Lctn / samples,
            midpoint: s.Mdpn / 100
          }))
        };
      } else {
        return {
          type: "noise",
          name: grad["Nm  "],
          roughness: grad.Smth / 4096,
          colorModel: exports.ClrS.decode(grad.ClrS),
          randomSeed: grad.RndS,
          restrictColors: !!grad.VctC,
          addTransparency: !!grad.ShTr,
          min: grad["Mnm "].map((x2) => x2 / 100),
          max: grad["Mxm "].map((x2) => x2 / 100)
        };
      }
    }
    function serializeGradient(grad) {
      var _a2, _b2;
      if (grad.type === "solid") {
        const samples = Math.round(((_a2 = grad.smoothness) !== null && _a2 !== void 0 ? _a2 : 1) * 4096);
        return {
          "Nm  ": grad.name || "",
          GrdF: "GrdF.CstS",
          Intr: samples,
          Clrs: grad.colorStops.map((s) => {
            var _a3;
            return {
              "Clr ": serializeColor(s.color),
              Type: "Clry.UsrS",
              Lctn: Math.round(s.location * samples),
              Mdpn: Math.round(((_a3 = s.midpoint) !== null && _a3 !== void 0 ? _a3 : 0.5) * 100)
            };
          }),
          Trns: grad.opacityStops.map((s) => {
            var _a3;
            return {
              Opct: unitsPercent(s.opacity),
              Lctn: Math.round(s.location * samples),
              Mdpn: Math.round(((_a3 = s.midpoint) !== null && _a3 !== void 0 ? _a3 : 0.5) * 100)
            };
          })
        };
      } else {
        return {
          GrdF: "GrdF.ClNs",
          "Nm  ": grad.name || "",
          ShTr: !!grad.addTransparency,
          VctC: !!grad.restrictColors,
          ClrS: exports.ClrS.encode(grad.colorModel),
          RndS: grad.randomSeed || 0,
          Smth: Math.round(((_b2 = grad.roughness) !== null && _b2 !== void 0 ? _b2 : 1) * 4096),
          "Mnm ": (grad.min || [0, 0, 0, 0]).map((x2) => x2 * 100),
          "Mxm ": (grad.max || [1, 1, 1, 1]).map((x2) => x2 * 100)
        };
      }
    }
    function parseGradientContent(descriptor) {
      const result = parseGradient(descriptor.Grad);
      result.style = exports.GrdT.decode(descriptor.Type);
      if (descriptor.Dthr !== void 0)
        result.dither = descriptor.Dthr;
      if (descriptor.gradientsInterpolationMethod !== void 0)
        result.interpolationMethod = exports.gradientInterpolationMethodType.decode(descriptor.gradientsInterpolationMethod);
      if (descriptor.Rvrs !== void 0)
        result.reverse = descriptor.Rvrs;
      if (descriptor.Angl !== void 0)
        result.angle = parseAngle(descriptor.Angl);
      if (descriptor["Scl "] !== void 0)
        result.scale = parsePercent(descriptor["Scl "]);
      if (descriptor.Algn !== void 0)
        result.align = descriptor.Algn;
      if (descriptor.Ofst !== void 0) {
        result.offset = {
          x: parsePercent(descriptor.Ofst.Hrzn),
          y: parsePercent(descriptor.Ofst.Vrtc)
        };
      }
      return result;
    }
    function parsePatternContent(descriptor) {
      const result = {
        name: descriptor.Ptrn["Nm  "],
        id: descriptor.Ptrn.Idnt
      };
      if (descriptor.Lnkd !== void 0)
        result.linked = descriptor.Lnkd;
      if (descriptor.phase !== void 0)
        result.phase = { x: descriptor.phase.Hrzn, y: descriptor.phase.Vrtc };
      return result;
    }
    function parseVectorContent(descriptor) {
      if ("Grad" in descriptor) {
        return parseGradientContent(descriptor);
      } else if ("Ptrn" in descriptor) {
        return Object.assign({ type: "pattern" }, parsePatternContent(descriptor));
      } else if ("Clr " in descriptor) {
        return { type: "color", color: parseColor(descriptor["Clr "]) };
      } else {
        throw new Error("Invalid vector content");
      }
    }
    function serializeGradientContent(content) {
      const result = {};
      if (content.dither !== void 0)
        result.Dthr = content.dither;
      if (content.interpolationMethod !== void 0)
        result.gradientsInterpolationMethod = exports.gradientInterpolationMethodType.encode(content.interpolationMethod);
      if (content.reverse !== void 0)
        result.Rvrs = content.reverse;
      if (content.angle !== void 0)
        result.Angl = unitsAngle(content.angle);
      result.Type = exports.GrdT.encode(content.style);
      if (content.align !== void 0)
        result.Algn = content.align;
      if (content.scale !== void 0)
        result["Scl "] = unitsPercent(content.scale);
      if (content.offset) {
        result.Ofst = {
          Hrzn: unitsPercent(content.offset.x),
          Vrtc: unitsPercent(content.offset.y)
        };
      }
      result.Grad = serializeGradient(content);
      return result;
    }
    function serializePatternContent(content) {
      const result = {
        Ptrn: {
          "Nm  ": content.name || "",
          Idnt: content.id || ""
        }
      };
      if (content.linked !== void 0)
        result.Lnkd = !!content.linked;
      if (content.phase !== void 0)
        result.phase = { Hrzn: content.phase.x, Vrtc: content.phase.y };
      return result;
    }
    function serializeVectorContent(content) {
      if (content.type === "color") {
        return { key: "SoCo", descriptor: { "Clr ": serializeColor(content.color) } };
      } else if (content.type === "pattern") {
        return { key: "PtFl", descriptor: serializePatternContent(content) };
      } else {
        return { key: "GdFl", descriptor: serializeGradientContent(content) };
      }
    }
    function parseColor(color) {
      if ("H   " in color) {
        return { h: parsePercentOrAngle(color["H   "]), s: color.Strt, b: color.Brgh };
      } else if ("Rd  " in color) {
        return { r: color["Rd  "], g: color["Grn "], b: color["Bl  "] };
      } else if ("Cyn " in color) {
        return { c: color["Cyn "], m: color.Mgnt, y: color["Ylw "], k: color.Blck };
      } else if ("Gry " in color) {
        return { k: color["Gry "] };
      } else if ("Lmnc" in color) {
        return { l: color.Lmnc, a: color["A   "], b: color["B   "] };
      } else if ("redFloat" in color) {
        return { fr: color.redFloat, fg: color.greenFloat, fb: color.blueFloat };
      } else {
        throw new Error("Unsupported color descriptor");
      }
    }
    function serializeColor(color) {
      if (!color) {
        return { _name: "", _classID: "RGBC", "Rd  ": 0, "Grn ": 0, "Bl  ": 0 };
      } else if ("r" in color) {
        return { _name: "", _classID: "RGBC", "Rd  ": color.r || 0, "Grn ": color.g || 0, "Bl  ": color.b || 0 };
      } else if ("fr" in color) {
        return { _name: "", _classID: "RGBC", redFloat: color.fr, greenFloat: color.fg, blueFloat: color.fb };
      } else if ("h" in color) {
        return { _name: "", _classID: "HSBC", "H   ": unitsAngle(color.h * 360), Strt: color.s || 0, Brgh: color.b || 0 };
      } else if ("c" in color) {
        return { _name: "", _classID: "CMYC", "Cyn ": color.c || 0, Mgnt: color.m || 0, "Ylw ": color.y || 0, Blck: color.k || 0 };
      } else if ("l" in color) {
        return { _name: "", _classID: "LABC", Lmnc: color.l || 0, "A   ": color.a || 0, "B   ": color.b || 0 };
      } else if ("k" in color) {
        return { _name: "", _classID: "GRYC", "Gry ": color.k };
      } else {
        throw new Error("Invalid color value");
      }
    }
    function parseAngle(x2) {
      if (x2 === void 0)
        return 0;
      if (x2.units !== "Angle")
        throw new Error(`Invalid units: ${x2.units}`);
      return x2.value;
    }
    function parsePercent(x2) {
      if (x2 === void 0)
        return 1;
      if (x2.units !== "Percent")
        throw new Error(`Invalid units: ${x2.units}`);
      return x2.value / 100;
    }
    function parsePercentOrAngle(x2) {
      if (x2 === void 0)
        return 1;
      if (x2.units === "Percent")
        return x2.value / 100;
      if (x2.units === "Angle")
        return x2.value / 360;
      throw new Error(`Invalid units: ${x2.units}`);
    }
    function parseUnits({ units, value }) {
      if (units !== "Pixels" && units !== "Millimeters" && units !== "Points" && units !== "None" && units !== "Picas" && units !== "Inches" && units !== "Centimeters" && units !== "Density") {
        throw new Error(`Invalid units: ${JSON.stringify({ units, value })}`);
      }
      return { value, units };
    }
    function parseUnitsOrNumber(value, units = "Pixels") {
      if (typeof value === "number")
        return { value, units };
      return parseUnits(value);
    }
    function parseUnitsToNumber({ units, value }, expectedUnits) {
      if (units !== expectedUnits)
        throw new Error(`Invalid units: ${JSON.stringify({ units, value })}`);
      return value;
    }
    function unitsAngle(value) {
      return { units: "Angle", value: value || 0 };
    }
    function unitsPercent(value) {
      return { units: "Percent", value: Math.round((value || 0) * 100) };
    }
    function unitsPercentF(value) {
      return { units: "Percent", value: (value || 0) * 100 };
    }
    function unitsValue(x2, key) {
      if (x2 == null)
        return { units: "Pixels", value: 0 };
      if (typeof x2 !== "object")
        throw new Error(`Invalid value: ${JSON.stringify(x2)} (key: ${key}) (should have value and units)`);
      const { units, value } = x2;
      if (typeof value !== "number")
        throw new Error(`Invalid value in ${JSON.stringify(x2)} (key: ${key})`);
      if (units !== "Pixels" && units !== "Millimeters" && units !== "Points" && units !== "None" && units !== "Picas" && units !== "Inches" && units !== "Centimeters" && units !== "Density") {
        throw new Error(`Invalid units in ${JSON.stringify(x2)} (key: ${key})`);
      }
      return { units, value };
    }
    function frac({ numerator, denominator }) {
      return { numerator, denominator };
    }
    exports.textGridding = (0, helpers_1.createEnum)("textGridding", "none", {
      none: "None",
      round: "Rnd "
    });
    exports.Ornt = (0, helpers_1.createEnum)("Ornt", "horizontal", {
      horizontal: "Hrzn",
      vertical: "Vrtc"
    });
    exports.Annt = (0, helpers_1.createEnum)("Annt", "sharp", {
      none: "Anno",
      sharp: "antiAliasSharp",
      crisp: "AnCr",
      strong: "AnSt",
      smooth: "AnSm",
      platform: "antiAliasPlatformGray",
      platformLCD: "antiAliasPlatformLCD"
    });
    exports.warpStyle = (0, helpers_1.createEnum)("warpStyle", "none", {
      none: "warpNone",
      arc: "warpArc",
      arcLower: "warpArcLower",
      arcUpper: "warpArcUpper",
      arch: "warpArch",
      bulge: "warpBulge",
      shellLower: "warpShellLower",
      shellUpper: "warpShellUpper",
      flag: "warpFlag",
      wave: "warpWave",
      fish: "warpFish",
      rise: "warpRise",
      fisheye: "warpFisheye",
      inflate: "warpInflate",
      squeeze: "warpSqueeze",
      twist: "warpTwist",
      cylinder: "warpCylinder",
      custom: "warpCustom"
    });
    exports.BlnM = (0, helpers_1.createEnum)("BlnM", "normal", {
      "normal": "Nrml",
      "dissolve": "Dslv",
      "darken": "Drkn",
      "multiply": "Mltp",
      "color burn": "CBrn",
      "linear burn": "linearBurn",
      "darker color": "darkerColor",
      "lighten": "Lghn",
      "screen": "Scrn",
      "color dodge": "CDdg",
      "linear dodge": "linearDodge",
      "lighter color": "lighterColor",
      "overlay": "Ovrl",
      "soft light": "SftL",
      "hard light": "HrdL",
      "vivid light": "vividLight",
      "linear light": "linearLight",
      "pin light": "pinLight",
      "hard mix": "hardMix",
      "difference": "Dfrn",
      "exclusion": "Xclu",
      "subtract": "blendSubtraction",
      "divide": "blendDivide",
      "hue": "H   ",
      "saturation": "Strt",
      "color": "Clr ",
      "luminosity": "Lmns",
      // used in ABR
      "linear height": "linearHeight",
      "height": "Hght",
      "subtraction": "Sbtr",
      // 2nd version of subtract ?
      "pass through": "????"
      // added for compilation to work, not used in actual files
    });
    exports.BESl = (0, helpers_1.createEnum)("BESl", "inner bevel", {
      "inner bevel": "InrB",
      "outer bevel": "OtrB",
      "emboss": "Embs",
      "pillow emboss": "PlEb",
      "stroke emboss": "strokeEmboss"
    });
    exports.bvlT = (0, helpers_1.createEnum)("bvlT", "smooth", {
      "smooth": "SfBL",
      "chisel hard": "PrBL",
      "chisel soft": "Slmt"
    });
    exports.BESs = (0, helpers_1.createEnum)("BESs", "up", {
      up: "In  ",
      down: "Out "
    });
    exports.BETE = (0, helpers_1.createEnum)("BETE", "softer", {
      softer: "SfBL",
      precise: "PrBL"
    });
    exports.IGSr = (0, helpers_1.createEnum)("IGSr", "edge", {
      edge: "SrcE",
      center: "SrcC"
    });
    exports.GrdT = (0, helpers_1.createEnum)("GrdT", "linear", {
      linear: "Lnr ",
      radial: "Rdl ",
      angle: "Angl",
      reflected: "Rflc",
      diamond: "Dmnd"
    });
    exports.animInterpStyleEnum = (0, helpers_1.createEnum)("animInterpStyle", "linear", {
      linear: "Lnr ",
      hold: "hold"
    });
    exports.stdTrackID = (0, helpers_1.createEnum)("stdTrackID", "opacity", {
      opacity: "opacityTrack",
      style: "styleTrack",
      sheetTransform: "sheetTransformTrack",
      sheetPosition: "sheetPositionTrack",
      globalLighting: "globalLightingTrack"
    });
    exports.gradientInterpolationMethodType = (0, helpers_1.createEnum)("gradientInterpolationMethodType", "perceptual", {
      perceptual: "Perc",
      linear: "Lnr ",
      classic: "Gcls",
      smooth: "Smoo"
      // TODO: stripes
    });
    exports.ClrS = (0, helpers_1.createEnum)("ClrS", "rgb", {
      rgb: "RGBC",
      hsb: "HSBl",
      lab: "LbCl",
      hsl: "HSLC"
    });
    exports.FStl = (0, helpers_1.createEnum)("FStl", "outside", {
      outside: "OutF",
      center: "CtrF",
      inside: "InsF"
    });
    exports.FrFl = (0, helpers_1.createEnum)("FrFl", "color", {
      color: "SClr",
      gradient: "GrFl",
      pattern: "Ptrn"
    });
    exports.ESliceType = (0, helpers_1.createEnum)("ESliceType", "image", {
      image: "Img ",
      noImage: "noImage"
    });
    exports.ESliceHorzAlign = (0, helpers_1.createEnum)("ESliceHorzAlign", "default", {
      default: "default"
    });
    exports.ESliceVertAlign = (0, helpers_1.createEnum)("ESliceVertAlign", "default", {
      default: "default"
    });
    exports.ESliceOrigin = (0, helpers_1.createEnum)("ESliceOrigin", "userGenerated", {
      userGenerated: "userGenerated",
      autoGenerated: "autoGenerated",
      layer: "layer"
    });
    exports.ESliceBGColorType = (0, helpers_1.createEnum)("ESliceBGColorType", "none", {
      none: "None",
      matte: "matte",
      color: "Clr "
    });
    exports.strokeStyleLineCapType = (0, helpers_1.createEnum)("strokeStyleLineCapType", "butt", {
      butt: "strokeStyleButtCap",
      round: "strokeStyleRoundCap",
      square: "strokeStyleSquareCap"
    });
    exports.strokeStyleLineJoinType = (0, helpers_1.createEnum)("strokeStyleLineJoinType", "miter", {
      miter: "strokeStyleMiterJoin",
      round: "strokeStyleRoundJoin",
      bevel: "strokeStyleBevelJoin"
    });
    exports.strokeStyleLineAlignment = (0, helpers_1.createEnum)("strokeStyleLineAlignment", "inside", {
      inside: "strokeStyleAlignInside",
      center: "strokeStyleAlignCenter",
      outside: "strokeStyleAlignOutside"
    });
    exports.BlrM = (0, helpers_1.createEnum)("BlrM", "spin", {
      spin: "Spn ",
      zoom: "Zm  "
    });
    exports.BlrQ = (0, helpers_1.createEnum)("BlrQ", "good", {
      draft: "Drft",
      good: "Gd  ",
      best: "Bst "
    });
    exports.SmBM = (0, helpers_1.createEnum)("SmBM", "normal", {
      normal: "SBMN",
      "edge only": "SBME",
      "overlay edge": "SBMO"
    });
    exports.SmBQ = (0, helpers_1.createEnum)("SmBQ", "medium", {
      low: "SBQL",
      medium: "SBQM",
      high: "SBQH"
    });
    exports.DspM = (0, helpers_1.createEnum)("DspM", "stretch to fit", {
      "stretch to fit": "StrF",
      "tile": "Tile"
    });
    exports.UndA = (0, helpers_1.createEnum)("UndA", "repeat edge pixels", {
      "wrap around": "WrpA",
      "repeat edge pixels": "RptE"
    });
    exports.Cnvr = (0, helpers_1.createEnum)("Cnvr", "rectangular to polar", {
      "rectangular to polar": "RctP",
      "polar to rectangular": "PlrR"
    });
    exports.RplS = (0, helpers_1.createEnum)("RplS", "medium", {
      small: "Sml ",
      medium: "Mdm ",
      large: "Lrg "
    });
    exports.SphM = (0, helpers_1.createEnum)("SphM", "normal", {
      "normal": "Nrml",
      "horizontal only": "HrzO",
      "vertical only": "VrtO"
    });
    exports.Wvtp = (0, helpers_1.createEnum)("Wvtp", "sine", {
      sine: "WvSn",
      triangle: "WvTr",
      square: "WvSq"
    });
    exports.ZZTy = (0, helpers_1.createEnum)("ZZTy", "pond ripples", {
      "around center": "ArnC",
      "out from center": "OtFr",
      "pond ripples": "PndR"
    });
    exports.Dstr = (0, helpers_1.createEnum)("Dstr", "uniform", {
      uniform: "Unfr",
      gaussian: "Gsn "
    });
    exports.Chnl = (0, helpers_1.createEnum)("Chnl", "composite", {
      red: "Rd  ",
      green: "Grn ",
      blue: "Bl  ",
      composite: "Cmps"
    });
    exports.MztT = (0, helpers_1.createEnum)("MztT", "fine dots", {
      "fine dots": "FnDt",
      "medium dots": "MdmD",
      "grainy dots": "GrnD",
      "coarse dots": "CrsD",
      "short lines": "ShrL",
      "medium lines": "MdmL",
      "long lines": "LngL",
      "short strokes": "ShSt",
      "medium strokes": "MdmS",
      "long strokes": "LngS"
    });
    exports.Lns = (0, helpers_1.createEnum)("Lns ", "50-300mm zoom", {
      "50-300mm zoom": "Zm  ",
      "32mm prime": "Nkn ",
      "105mm prime": "Nkn1",
      "movie prime": "PnVs"
    });
    exports.blurType = (0, helpers_1.createEnum)("blurType", "gaussian blur", {
      "gaussian blur": "GsnB",
      "lens blur": "lensBlur",
      "motion blur": "MtnB"
    });
    exports.DfsM = (0, helpers_1.createEnum)("DfsM", "normal", {
      "normal": "Nrml",
      "darken only": "DrkO",
      "lighten only": "LghO",
      "anisotropic": "anisotropic"
    });
    exports.ExtT = (0, helpers_1.createEnum)("ExtT", "blocks", {
      blocks: "Blks",
      pyramids: "Pyrm"
    });
    exports.ExtR = (0, helpers_1.createEnum)("ExtR", "random", {
      random: "Rndm",
      "level-based": "LvlB"
    });
    exports.FlCl = (0, helpers_1.createEnum)("FlCl", "background color", {
      "background color": "FlBc",
      "foreground color": "FlFr",
      "inverse image": "FlIn",
      "unaltered image": "FlSm"
    });
    exports.CntE = (0, helpers_1.createEnum)("CntE", "upper", {
      lower: "Lwr ",
      upper: "Upr "
    });
    exports.WndM = (0, helpers_1.createEnum)("WndM", "wind", {
      wind: "Wnd ",
      blast: "Blst",
      stagger: "Stgr"
    });
    exports.Drct = (0, helpers_1.createEnum)("Drct", "right", {
      left: "Left",
      right: "Rght"
    });
    exports.IntE = (0, helpers_1.createEnum)("IntE", "odd lines", {
      "odd lines": "ElmO",
      "even lines": "ElmE"
    });
    exports.IntC = (0, helpers_1.createEnum)("IntC", "interpolation", {
      duplication: "CrtD",
      interpolation: "CrtI"
    });
    exports.FlMd = (0, helpers_1.createEnum)("FlMd", "wrap around", {
      "set to transparent": "Bckg",
      "repeat edge pixels": "Rpt ",
      "wrap around": "Wrp "
    });
    exports.prjM = (0, helpers_1.createEnum)("prjM", "fisheye", {
      "fisheye": "fisP",
      "perspective": "perP",
      "auto": "auto",
      "full spherical": "fusP"
    });
    exports.presetKindType = (0, helpers_1.createEnum)("presetKindType", "custom", {
      custom: "presetKindCustom",
      default: "presetKindDefault"
    });
  }
});

// node_modules/ag-psd/dist/imageResources.js
var require_imageResources = __commonJS({
  "node_modules/ag-psd/dist/imageResources.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resourceHandlersMap = exports.resourceHandlers = void 0;
    var base64_js_1 = require_base64_js();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var helpers_1 = require_helpers();
    var utf8_1 = require_utf8();
    var descriptor_1 = require_descriptor();
    exports.resourceHandlers = [];
    exports.resourceHandlersMap = {};
    function addHandler(key, has, read, write) {
      const handler = { key, has, read, write };
      exports.resourceHandlers.push(handler);
      exports.resourceHandlersMap[handler.key] = handler;
    }
    var LOG_MOCK_HANDLERS = false;
    var RESOLUTION_UNITS = [void 0, "PPI", "PPCM"];
    var MEASUREMENT_UNITS = [void 0, "Inches", "Centimeters", "Points", "Picas", "Columns"];
    var hex = "0123456789abcdef";
    function charToNibble(code) {
      if (code <= 57)
        return code - 48;
      if (code >= 97)
        return code - 87;
      return code - 55;
    }
    function byteAt(value, index) {
      return charToNibble(value.charCodeAt(index)) << 4 | charToNibble(value.charCodeAt(index + 1));
    }
    function readUtf8String(reader, length) {
      const buffer = (0, psdReader_1.readBytes)(reader, length);
      return (0, utf8_1.decodeString)(buffer);
    }
    function writeUtf8String(writer, value) {
      const buffer = (0, utf8_1.encodeString)(value);
      (0, psdWriter_1.writeBytes)(writer, buffer);
    }
    function readEncodedString(reader) {
      const length = (0, psdReader_1.readUint8)(reader);
      const buffer = (0, psdReader_1.readBytes)(reader, length);
      let notAscii = false;
      for (let i2 = 0; i2 < buffer.byteLength; i2++) {
        if (buffer[i2] & 128) {
          notAscii = true;
          break;
        }
      }
      if (notAscii) {
        try {
          const decoder = new TextDecoder("gbk");
          return decoder.decode(buffer);
        } catch (_a2) {
        }
      }
      return (0, utf8_1.decodeString)(buffer);
    }
    function writeEncodedString(writer, value) {
      let ascii = "";
      for (let i2 = 0, code = value.codePointAt(i2++); code !== void 0; code = value.codePointAt(i2++)) {
        ascii += code > 127 ? "?" : String.fromCodePoint(code);
      }
      const buffer = (0, utf8_1.encodeString)(ascii);
      (0, psdWriter_1.writeUint8)(writer, buffer.byteLength);
      (0, psdWriter_1.writeBytes)(writer, buffer);
    }
    helpers_1.MOCK_HANDLERS && addHandler(
      1028,
      // IPTC-NAA record
      // IPTC-NAA record
      (target) => target._ir1028 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1028", left());
        target._ir1028 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1028);
      }
    );
    addHandler(1061, (target) => target.captionDigest !== void 0, (reader, target) => {
      let captionDigest = "";
      for (let i2 = 0; i2 < 16; i2++) {
        const byte = (0, psdReader_1.readUint8)(reader);
        captionDigest += hex[byte >> 4];
        captionDigest += hex[byte & 15];
      }
      target.captionDigest = captionDigest;
    }, (writer, target) => {
      for (let i2 = 0; i2 < 16; i2++) {
        (0, psdWriter_1.writeUint8)(writer, byteAt(target.captionDigest, i2 * 2));
      }
    });
    addHandler(1060, (target) => target.xmpMetadata !== void 0, (reader, target, left) => {
      target.xmpMetadata = readUtf8String(reader, left());
    }, (writer, target) => {
      writeUtf8String(writer, target.xmpMetadata);
    });
    var Inte = (0, helpers_1.createEnum)("Inte", "perceptual", {
      "perceptual": "Img ",
      "saturation": "Grp ",
      "relative colorimetric": "Clrm",
      "absolute colorimetric": "AClr"
    });
    helpers_1.MOCK_HANDLERS && addHandler(
      1085,
      // Windows DEVMODE. Variable OS specific info for Windows.
      // Windows DEVMODE. Variable OS specific info for Windows.
      (target) => target._ir1085 !== void 0,
      (reader, target, left) => {
        target._ir1085 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1085);
      }
    );
    addHandler(1082, (target) => target.printInformation !== void 0, (reader, target) => {
      var _a2, _b2;
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.printInformation = {
        printerName: desc.printerName || "",
        renderingIntent: Inte.decode((_a2 = desc.Inte) !== null && _a2 !== void 0 ? _a2 : "Inte.Img ")
      };
      const info = target.printInformation;
      if (desc.PstS !== void 0)
        info.printerManagesColors = desc.PstS;
      if (desc["Nm  "] !== void 0)
        info.printerProfile = desc["Nm  "];
      if (desc.MpBl !== void 0)
        info.blackPointCompensation = desc.MpBl;
      if (desc.printSixteenBit !== void 0)
        info.printSixteenBit = desc.printSixteenBit;
      if (desc.hardProof !== void 0)
        info.hardProof = desc.hardProof;
      if (desc.printProofSetup) {
        if ("Bltn" in desc.printProofSetup) {
          info.proofSetup = { builtin: desc.printProofSetup.Bltn.split(".")[1] };
        } else {
          info.proofSetup = {
            profile: desc.printProofSetup.profile,
            renderingIntent: Inte.decode((_b2 = desc.printProofSetup.Inte) !== null && _b2 !== void 0 ? _b2 : "Inte.Img "),
            blackPointCompensation: !!desc.printProofSetup.MpBl,
            paperWhite: !!desc.printProofSetup.paperWhite
          };
        }
      }
    }, (writer, target) => {
      var _a2, _b2;
      const info = target.printInformation;
      const desc = {};
      if (info.printerManagesColors) {
        desc.PstS = true;
      } else {
        if (info.hardProof !== void 0)
          desc.hardProof = !!info.hardProof;
        desc.ClrS = "ClrS.RGBC";
        desc["Nm  "] = (_a2 = info.printerProfile) !== null && _a2 !== void 0 ? _a2 : "CIE RGB";
      }
      desc.Inte = Inte.encode(info.renderingIntent);
      if (!info.printerManagesColors)
        desc.MpBl = !!info.blackPointCompensation;
      desc.printSixteenBit = !!info.printSixteenBit;
      desc.printerName = info.printerName || "";
      if (info.proofSetup && "profile" in info.proofSetup) {
        desc.printProofSetup = {
          profile: info.proofSetup.profile || "",
          Inte: Inte.encode(info.proofSetup.renderingIntent),
          MpBl: !!info.proofSetup.blackPointCompensation,
          paperWhite: !!info.proofSetup.paperWhite
        };
      } else {
        desc.printProofSetup = {
          Bltn: ((_b2 = info.proofSetup) === null || _b2 === void 0 ? void 0 : _b2.builtin) ? `builtinProof.${info.proofSetup.builtin}` : "builtinProof.proofCMYK"
        };
      }
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "printOutput", desc);
    });
    helpers_1.MOCK_HANDLERS && addHandler(
      1083,
      // Print style
      // Print style
      (target) => target._ir1083 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1083", left());
        target._ir1083 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1083);
      }
    );
    addHandler(1005, (target) => target.resolutionInfo !== void 0, (reader, target) => {
      const horizontalResolution = (0, psdReader_1.readFixedPoint32)(reader);
      const horizontalResolutionUnit = (0, psdReader_1.readUint16)(reader);
      const widthUnit = (0, psdReader_1.readUint16)(reader);
      const verticalResolution = (0, psdReader_1.readFixedPoint32)(reader);
      const verticalResolutionUnit = (0, psdReader_1.readUint16)(reader);
      const heightUnit = (0, psdReader_1.readUint16)(reader);
      target.resolutionInfo = {
        horizontalResolution,
        horizontalResolutionUnit: RESOLUTION_UNITS[horizontalResolutionUnit] || "PPI",
        widthUnit: MEASUREMENT_UNITS[widthUnit] || "Inches",
        verticalResolution,
        verticalResolutionUnit: RESOLUTION_UNITS[verticalResolutionUnit] || "PPI",
        heightUnit: MEASUREMENT_UNITS[heightUnit] || "Inches"
      };
    }, (writer, target) => {
      const info = target.resolutionInfo;
      (0, psdWriter_1.writeFixedPoint32)(writer, info.horizontalResolution || 0);
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.horizontalResolutionUnit)));
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.widthUnit)));
      (0, psdWriter_1.writeFixedPoint32)(writer, info.verticalResolution || 0);
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.verticalResolutionUnit)));
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.heightUnit)));
    });
    var printScaleStyles = ["centered", "size to fit", "user defined"];
    addHandler(1062, (target) => target.printScale !== void 0, (reader, target) => {
      target.printScale = {
        style: printScaleStyles[(0, psdReader_1.readInt16)(reader)],
        x: (0, psdReader_1.readFloat32)(reader),
        y: (0, psdReader_1.readFloat32)(reader),
        scale: (0, psdReader_1.readFloat32)(reader)
      };
    }, (writer, target) => {
      const { style, x: x2, y, scale } = target.printScale;
      (0, psdWriter_1.writeInt16)(writer, Math.max(0, printScaleStyles.indexOf(style)));
      (0, psdWriter_1.writeFloat32)(writer, x2 || 0);
      (0, psdWriter_1.writeFloat32)(writer, y || 0);
      (0, psdWriter_1.writeFloat32)(writer, scale || 0);
    });
    addHandler(1006, (target) => target.alphaChannelNames !== void 0, (reader, target, left) => {
      if (!target.alphaChannelNames) {
        target.alphaChannelNames = [];
        while (left() > 0) {
          const value = readEncodedString(reader);
          target.alphaChannelNames.push(value);
        }
      } else {
        (0, psdReader_1.skipBytes)(reader, left());
      }
    }, (writer, target) => {
      for (const name of target.alphaChannelNames) {
        writeEncodedString(writer, name);
      }
    });
    addHandler(1045, (target) => target.alphaChannelNames !== void 0, (reader, target, left) => {
      target.alphaChannelNames = [];
      while (left() > 0) {
        target.alphaChannelNames.push((0, psdReader_1.readUnicodeString)(reader));
      }
    }, (writer, target) => {
      for (const name of target.alphaChannelNames) {
        (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, name);
      }
    });
    helpers_1.MOCK_HANDLERS && addHandler(1077, (target) => target._ir1077 !== void 0, (reader, target, left) => {
      LOG_MOCK_HANDLERS && console.log("image resource 1077", left());
      target._ir1077 = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => {
      (0, psdWriter_1.writeBytes)(writer, target._ir1077);
    });
    addHandler(1053, (target) => target.alphaIdentifiers !== void 0, (reader, target, left) => {
      target.alphaIdentifiers = [];
      while (left() >= 4) {
        target.alphaIdentifiers.push((0, psdReader_1.readUint32)(reader));
      }
    }, (writer, target) => {
      for (const id of target.alphaIdentifiers) {
        (0, psdWriter_1.writeUint32)(writer, id);
      }
    });
    addHandler(1010, (target) => target.backgroundColor !== void 0, (reader, target) => target.backgroundColor = (0, psdReader_1.readColor)(reader), (writer, target) => (0, psdWriter_1.writeColor)(writer, target.backgroundColor));
    addHandler(1037, (target) => target.globalAngle !== void 0, (reader, target) => target.globalAngle = (0, psdReader_1.readInt32)(reader), (writer, target) => (0, psdWriter_1.writeInt32)(writer, target.globalAngle));
    addHandler(1049, (target) => target.globalAltitude !== void 0, (reader, target) => target.globalAltitude = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.globalAltitude));
    addHandler(1011, (target) => target.printFlags !== void 0, (reader, target, left) => {
      target.printFlags = {
        labels: !!(0, psdReader_1.readUint8)(reader),
        cropMarks: !!(0, psdReader_1.readUint8)(reader),
        colorBars: !!(0, psdReader_1.readUint8)(reader),
        registrationMarks: !!(0, psdReader_1.readUint8)(reader),
        negative: !!(0, psdReader_1.readUint8)(reader),
        flip: !!(0, psdReader_1.readUint8)(reader),
        interpolate: !!(0, psdReader_1.readUint8)(reader),
        caption: !!(0, psdReader_1.readUint8)(reader),
        printFlags: left() ? !!(0, psdReader_1.readUint8)(reader) : false
      };
    }, (writer, target) => {
      const flags = target.printFlags;
      (0, psdWriter_1.writeUint8)(writer, flags.labels ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.cropMarks ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.colorBars ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.registrationMarks ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.negative ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.flip ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.interpolate ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.caption ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.printFlags ? 1 : 0);
    });
    addHandler(
      1034,
      // Copyright flag
      // Copyright flag
      (target) => target.copyrighted !== void 0,
      (reader, target) => {
        target.copyrighted = !!(0, psdReader_1.readUint8)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint8)(writer, target.copyrighted ? 1 : 0);
      }
    );
    addHandler(
      1035,
      // URL
      // URL
      (target) => target.url !== void 0,
      (reader, target, left) => {
        target.url = (0, psdReader_1.readAsciiString)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeAsciiString)(writer, target.url);
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      1e4,
      // Print flags
      // Print flags
      (target) => target._ir10000 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 10000", left());
        target._ir10000 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir10000);
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      1013,
      // Color halftoning
      // Color halftoning
      (target) => target._ir1013 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1013", left());
        target._ir1013 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1013);
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      1016,
      // Color transfer functions
      // Color transfer functions
      (target) => target._ir1016 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1016", left());
        target._ir1016 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1016);
      }
    );
    addHandler(
      1080,
      // Count Information
      // Count Information
      (target) => target.countInformation !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.countInformation = desc.countGroupList.map((g) => ({
          color: { r: g["Rd  "], g: g["Grn "], b: g["Bl  "] },
          name: g["Nm  "],
          size: g["Rds "],
          fontSize: g.fontSize,
          visible: g.Vsbl,
          points: g.countObjectList.map((p) => ({ x: p["X   "], y: p["Y   "] }))
        }));
      },
      (writer, target) => {
        const desc = {
          Vrsn: 1,
          countGroupList: target.countInformation.map((g) => ({
            "Rd  ": g.color.r,
            "Grn ": g.color.g,
            "Bl  ": g.color.b,
            "Nm  ": g.name,
            "Rds ": g.size,
            fontSize: g.fontSize,
            Vsbl: g.visible,
            countObjectList: g.points.map((p) => ({ "X   ": p.x, "Y   ": p.y }))
          }))
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "Cnt ", desc);
      }
    );
    addHandler(1024, (target) => target.layerState !== void 0, (reader, target) => target.layerState = (0, psdReader_1.readUint16)(reader), (writer, target) => (0, psdWriter_1.writeUint16)(writer, target.layerState));
    addHandler(1026, (target) => target.layersGroup !== void 0, (reader, target, left) => {
      target.layersGroup = [];
      while (left() > 0) {
        target.layersGroup.push((0, psdReader_1.readUint16)(reader));
      }
    }, (writer, target) => {
      for (const g of target.layersGroup) {
        (0, psdWriter_1.writeUint16)(writer, g);
      }
    });
    addHandler(1072, (target) => target.layerGroupsEnabledId !== void 0, (reader, target, left) => {
      target.layerGroupsEnabledId = [];
      while (left() > 0) {
        target.layerGroupsEnabledId.push((0, psdReader_1.readUint8)(reader));
      }
    }, (writer, target) => {
      for (const id of target.layerGroupsEnabledId) {
        (0, psdWriter_1.writeUint8)(writer, id);
      }
    });
    addHandler(1069, (target) => target.layerSelectionIds !== void 0, (reader, target) => {
      let count = (0, psdReader_1.readUint16)(reader);
      target.layerSelectionIds = [];
      while (count--) {
        target.layerSelectionIds.push((0, psdReader_1.readUint32)(reader));
      }
    }, (writer, target) => {
      (0, psdWriter_1.writeUint16)(writer, target.layerSelectionIds.length);
      for (const id of target.layerSelectionIds) {
        (0, psdWriter_1.writeUint32)(writer, id);
      }
    });
    addHandler(1032, (target) => target.gridAndGuidesInformation !== void 0, (reader, target) => {
      const version = (0, psdReader_1.readUint32)(reader);
      const horizontal = (0, psdReader_1.readUint32)(reader);
      const vertical = (0, psdReader_1.readUint32)(reader);
      const count = (0, psdReader_1.readUint32)(reader);
      if (version !== 1)
        throw new Error(`Invalid 1032 resource version: ${version}`);
      target.gridAndGuidesInformation = {
        grid: { horizontal, vertical },
        guides: []
      };
      for (let i2 = 0; i2 < count; i2++) {
        target.gridAndGuidesInformation.guides.push({
          location: (0, psdReader_1.readUint32)(reader) / 32,
          direction: (0, psdReader_1.readUint8)(reader) ? "horizontal" : "vertical"
        });
      }
    }, (writer, target) => {
      const info = target.gridAndGuidesInformation;
      const grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
      const guides = info.guides || [];
      (0, psdWriter_1.writeUint32)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, grid.horizontal);
      (0, psdWriter_1.writeUint32)(writer, grid.vertical);
      (0, psdWriter_1.writeUint32)(writer, guides.length);
      for (const g of guides) {
        (0, psdWriter_1.writeUint32)(writer, g.location * 32);
        (0, psdWriter_1.writeUint8)(writer, g.direction === "horizontal" ? 1 : 0);
      }
    });
    addHandler(
      1065,
      // Layer Comps
      // Layer Comps
      (target) => target.layerComps !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
        target.layerComps = { list: [] };
        for (const item of desc.list) {
          target.layerComps.list.push({
            id: item.compID,
            name: item["Nm  "],
            capturedInfo: item.capturedInfo
          });
          if ("comment" in item)
            target.layerComps.list[target.layerComps.list.length - 1].comment = item.comment;
        }
        if ("lastAppliedComp" in desc)
          target.layerComps.lastApplied = desc.lastAppliedComp;
      },
      (writer, target) => {
        const layerComps = target.layerComps;
        const desc = { list: [] };
        for (const item of layerComps.list) {
          const t = {};
          t._classID = "Comp";
          t["Nm  "] = item.name;
          if ("comment" in item)
            t.comment = item.comment;
          t.compID = item.id;
          t.capturedInfo = item.capturedInfo;
          desc.list.push(t);
        }
        if ("lastApplied" in layerComps)
          desc.lastAppliedComp = layerComps.lastApplied;
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "CompList", desc);
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      1092,
      // ???
      // ???
      (target) => target._ir1092 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1092", left());
        target._ir1092 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1092);
      }
    );
    var onionSkinsBlendModes = [
      "normal",
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      "multiply",
      "screen",
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      "difference"
    ];
    addHandler(
      1078,
      // Onion Skins
      // Onion Skins
      (target) => target.onionSkins !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.onionSkins = {
          enabled: desc.enab,
          framesBefore: desc.numBefore,
          framesAfter: desc.numAfter,
          frameSpacing: desc.Spcn,
          minOpacity: desc.minOpacity / 100,
          maxOpacity: desc.maxOpacity / 100,
          blendMode: onionSkinsBlendModes[desc.BlnM] || "normal"
        };
      },
      (writer, target) => {
        const onionSkins = target.onionSkins;
        const desc = {
          Vrsn: 1,
          enab: onionSkins.enabled,
          numBefore: onionSkins.framesBefore,
          numAfter: onionSkins.framesAfter,
          Spcn: onionSkins.frameSpacing,
          minOpacity: onionSkins.minOpacity * 100 | 0,
          maxOpacity: onionSkins.maxOpacity * 100 | 0,
          BlnM: Math.max(0, onionSkinsBlendModes.indexOf(onionSkins.blendMode))
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      }
    );
    addHandler(
      1075,
      // Timeline Information
      // Timeline Information
      (target) => target.timelineInformation !== void 0,
      (reader, target) => {
        var _a2, _b2;
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.timelineInformation = {
          enabled: desc.enab,
          frameStep: (0, descriptor_1.frac)(desc.frameStep),
          frameRate: desc.frameRate,
          time: (0, descriptor_1.frac)(desc.time),
          duration: (0, descriptor_1.frac)(desc.duration),
          workInTime: (0, descriptor_1.frac)(desc.workInTime),
          workOutTime: (0, descriptor_1.frac)(desc.workOutTime),
          repeats: desc.LCnt,
          hasMotion: desc.hasMotion,
          globalTracks: (0, descriptor_1.parseTrackList)(desc.globalTrackList, !!reader.logMissingFeatures)
        };
        if ((_b2 = (_a2 = desc.audioClipGroupList) === null || _a2 === void 0 ? void 0 : _a2.audioClipGroupList) === null || _b2 === void 0 ? void 0 : _b2.length) {
          target.timelineInformation.audioClipGroups = desc.audioClipGroupList.audioClipGroupList.map((g) => ({
            id: g.groupID,
            muted: g.muted,
            audioClips: g.audioClipList.map(({ clipID, timeScope, muted, audioLevel, frameReader }) => ({
              id: clipID,
              start: (0, descriptor_1.frac)(timeScope.Strt),
              duration: (0, descriptor_1.frac)(timeScope.duration),
              inTime: (0, descriptor_1.frac)(timeScope.inTime),
              outTime: (0, descriptor_1.frac)(timeScope.outTime),
              muted,
              audioLevel,
              frameReader: {
                type: frameReader.frameReaderType,
                mediaDescriptor: frameReader.mediaDescriptor,
                link: {
                  name: frameReader["Lnk "]["Nm  "],
                  fullPath: frameReader["Lnk "].fullPath,
                  relativePath: frameReader["Lnk "].relPath
                }
              }
            }))
          }));
        }
      },
      (writer, target) => {
        var _a2;
        const timeline = target.timelineInformation;
        const desc = {
          Vrsn: 1,
          enab: timeline.enabled,
          frameStep: timeline.frameStep,
          frameRate: timeline.frameRate,
          time: timeline.time,
          duration: timeline.duration,
          workInTime: timeline.workInTime,
          workOutTime: timeline.workOutTime,
          LCnt: timeline.repeats,
          globalTrackList: (0, descriptor_1.serializeTrackList)(timeline.globalTracks),
          audioClipGroupList: {
            audioClipGroupList: (_a2 = timeline.audioClipGroups) === null || _a2 === void 0 ? void 0 : _a2.map((a) => ({
              groupID: a.id,
              muted: a.muted,
              audioClipList: a.audioClips.map((c) => ({
                clipID: c.id,
                timeScope: {
                  Vrsn: 1,
                  Strt: c.start,
                  duration: c.duration,
                  inTime: c.inTime,
                  outTime: c.outTime
                },
                frameReader: {
                  frameReaderType: c.frameReader.type,
                  descVersion: 1,
                  "Lnk ": {
                    descVersion: 1,
                    "Nm  ": c.frameReader.link.name,
                    fullPath: c.frameReader.link.fullPath,
                    relPath: c.frameReader.link.relativePath
                  },
                  mediaDescriptor: c.frameReader.mediaDescriptor
                },
                muted: c.muted,
                audioLevel: c.audioLevel
              }))
            }))
          },
          hasMotion: timeline.hasMotion
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "anim");
      }
    );
    addHandler(
      1076,
      // Sheet Disclosure
      // Sheet Disclosure
      (target) => target.sheetDisclosure !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.sheetDisclosure = {};
        if (desc.sheetTimelineOptions) {
          target.sheetDisclosure.sheetTimelineOptions = desc.sheetTimelineOptions.map((o) => ({
            sheetID: o.sheetID,
            sheetDisclosed: o.sheetDisclosed,
            lightsDisclosed: o.lightsDisclosed,
            meshesDisclosed: o.meshesDisclosed,
            materialsDisclosed: o.materialsDisclosed
          }));
        }
      },
      (writer, target) => {
        const disclosure = target.sheetDisclosure;
        const desc = { Vrsn: 1 };
        if (disclosure.sheetTimelineOptions) {
          desc.sheetTimelineOptions = disclosure.sheetTimelineOptions.map((d) => ({
            Vrsn: 2,
            sheetID: d.sheetID,
            sheetDisclosed: d.sheetDisclosed,
            lightsDisclosed: d.lightsDisclosed,
            meshesDisclosed: d.meshesDisclosed,
            materialsDisclosed: d.materialsDisclosed
          }));
        }
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      }
    );
    addHandler(
      1054,
      // URL List
      // URL List
      (target) => target.urlsList !== void 0,
      (reader, target) => {
        const count = (0, psdReader_1.readUint32)(reader);
        target.urlsList = [];
        for (let i2 = 0; i2 < count; i2++) {
          const long = (0, psdReader_1.readSignature)(reader);
          if (long !== "slic" && reader.throwForMissingFeatures)
            throw new Error("Unknown long");
          const id = (0, psdReader_1.readUint32)(reader);
          const url = (0, psdReader_1.readUnicodeString)(reader);
          target.urlsList.push({ id, url, ref: "slice" });
        }
      },
      (writer, target) => {
        const list = target.urlsList;
        (0, psdWriter_1.writeUint32)(writer, list.length);
        for (let i2 = 0; i2 < list.length; i2++) {
          (0, psdWriter_1.writeSignature)(writer, "slic");
          (0, psdWriter_1.writeUint32)(writer, list[i2].id);
          (0, psdWriter_1.writeUnicodeString)(writer, list[i2].url);
        }
      }
    );
    function boundsToBounds(bounds) {
      return { "Top ": bounds.top, Left: bounds.left, Btom: bounds.bottom, Rght: bounds.right };
    }
    function boundsFromBounds(bounds) {
      return { top: bounds["Top "], left: bounds.Left, bottom: bounds.Btom, right: bounds.Rght };
    }
    function clamped(array, index) {
      return array[Math.max(0, Math.min(array.length - 1, index))];
    }
    var sliceOrigins = ["autoGenerated", "layer", "userGenerated"];
    var sliceTypes = ["noImage", "image"];
    var sliceAlignments = ["default"];
    addHandler(
      1050,
      // Slices
      // Slices
      (target) => target.slices ? target.slices.length : 0,
      (reader, target, leftBytes) => {
        const version = (0, psdReader_1.readUint32)(reader);
        if (version === 6) {
          if (!target.slices)
            target.slices = [];
          const top = (0, psdReader_1.readInt32)(reader);
          const left = (0, psdReader_1.readInt32)(reader);
          const bottom = (0, psdReader_1.readInt32)(reader);
          const right = (0, psdReader_1.readInt32)(reader);
          const groupName = (0, psdReader_1.readUnicodeString)(reader);
          const count = (0, psdReader_1.readUint32)(reader);
          target.slices.push({ bounds: { top, left, bottom, right }, groupName, slices: [] });
          const slices = target.slices[target.slices.length - 1].slices;
          for (let i2 = 0; i2 < count; i2++) {
            const id = (0, psdReader_1.readUint32)(reader);
            const groupId = (0, psdReader_1.readUint32)(reader);
            const origin = clamped(sliceOrigins, (0, psdReader_1.readUint32)(reader));
            const associatedLayerId = origin == "layer" ? (0, psdReader_1.readUint32)(reader) : 0;
            const name = (0, psdReader_1.readUnicodeString)(reader);
            const type = clamped(sliceTypes, (0, psdReader_1.readUint32)(reader));
            const left2 = (0, psdReader_1.readInt32)(reader);
            const top2 = (0, psdReader_1.readInt32)(reader);
            const right2 = (0, psdReader_1.readInt32)(reader);
            const bottom2 = (0, psdReader_1.readInt32)(reader);
            const url = (0, psdReader_1.readUnicodeString)(reader);
            const target2 = (0, psdReader_1.readUnicodeString)(reader);
            const message = (0, psdReader_1.readUnicodeString)(reader);
            const altTag = (0, psdReader_1.readUnicodeString)(reader);
            const cellTextIsHTML = !!(0, psdReader_1.readUint8)(reader);
            const cellText = (0, psdReader_1.readUnicodeString)(reader);
            const horizontalAlignment = clamped(sliceAlignments, (0, psdReader_1.readUint32)(reader));
            const verticalAlignment = clamped(sliceAlignments, (0, psdReader_1.readUint32)(reader));
            const a = (0, psdReader_1.readUint8)(reader);
            const r = (0, psdReader_1.readUint8)(reader);
            const g = (0, psdReader_1.readUint8)(reader);
            const b = (0, psdReader_1.readUint8)(reader);
            const backgroundColorType = a + r + g + b === 0 ? "none" : a === 0 ? "matte" : "color";
            slices.push({
              id,
              groupId,
              origin,
              associatedLayerId,
              name,
              target: target2,
              message,
              altTag,
              cellTextIsHTML,
              cellText,
              horizontalAlignment,
              verticalAlignment,
              type,
              url,
              bounds: { top: top2, left: left2, bottom: bottom2, right: right2 },
              backgroundColorType,
              backgroundColor: { r, g, b, a }
            });
          }
          if (leftBytes()) {
            const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
            desc.slices.forEach((d) => {
              const slice = slices.find((s) => d.sliceID == s.id);
              if (slice) {
                slice.topOutset = d.topOutset;
                slice.leftOutset = d.leftOutset;
                slice.bottomOutset = d.bottomOutset;
                slice.rightOutset = d.rightOutset;
              }
            });
          }
        } else if (version === 7 || version === 8) {
          const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
          if (!target.slices)
            target.slices = [];
          target.slices.push({
            groupName: desc.baseName,
            bounds: boundsFromBounds(desc.bounds),
            slices: desc.slices.map((s) => Object.assign(Object.assign({}, s["Nm  "] ? { name: s["Nm  "] } : {}), { id: s.sliceID, groupId: s.groupID, associatedLayerId: 0, origin: descriptor_1.ESliceOrigin.decode(s.origin), type: descriptor_1.ESliceType.decode(s.Type), bounds: boundsFromBounds(s.bounds), url: s.url, target: s.null, message: s.Msge, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horizontalAlignment: descriptor_1.ESliceHorzAlign.decode(s.horzAlign), verticalAlignment: descriptor_1.ESliceVertAlign.decode(s.vertAlign), backgroundColorType: descriptor_1.ESliceBGColorType.decode(s.bgColorType), backgroundColor: s.bgColor ? { r: s.bgColor["Rd  "], g: s.bgColor["Grn "], b: s.bgColor["Bl  "], a: s.bgColor.alpha } : { r: 0, g: 0, b: 0, a: 0 }, topOutset: s.topOutset || 0, leftOutset: s.leftOutset || 0, bottomOutset: s.bottomOutset || 0, rightOutset: s.rightOutset || 0 }))
          });
        } else {
          throw new Error(`Invalid slices version (${version})`);
        }
      },
      (writer, target, index) => {
        const { bounds, groupName, slices } = target.slices[index];
        (0, psdWriter_1.writeUint32)(writer, 6);
        (0, psdWriter_1.writeInt32)(writer, bounds.top);
        (0, psdWriter_1.writeInt32)(writer, bounds.left);
        (0, psdWriter_1.writeInt32)(writer, bounds.bottom);
        (0, psdWriter_1.writeInt32)(writer, bounds.right);
        (0, psdWriter_1.writeUnicodeString)(writer, groupName);
        (0, psdWriter_1.writeUint32)(writer, slices.length);
        for (let i2 = 0; i2 < slices.length; i2++) {
          const slice = slices[i2];
          let { a, r, g, b } = slice.backgroundColor;
          if (slice.backgroundColorType === "none") {
            a = r = g = b = 0;
          } else if (slice.backgroundColorType === "matte") {
            a = 0;
            r = g = b = 255;
          }
          (0, psdWriter_1.writeUint32)(writer, slice.id);
          (0, psdWriter_1.writeUint32)(writer, slice.groupId);
          (0, psdWriter_1.writeUint32)(writer, sliceOrigins.indexOf(slice.origin));
          if (slice.origin === "layer")
            (0, psdWriter_1.writeUint32)(writer, slice.associatedLayerId);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.name || "");
          (0, psdWriter_1.writeUint32)(writer, sliceTypes.indexOf(slice.type));
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.left);
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.top);
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.right);
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.bottom);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.url);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.target);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.message);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.altTag);
          (0, psdWriter_1.writeUint8)(writer, slice.cellTextIsHTML ? 1 : 0);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.cellText);
          (0, psdWriter_1.writeUint32)(writer, sliceAlignments.indexOf(slice.horizontalAlignment));
          (0, psdWriter_1.writeUint32)(writer, sliceAlignments.indexOf(slice.verticalAlignment));
          (0, psdWriter_1.writeUint8)(writer, a);
          (0, psdWriter_1.writeUint8)(writer, r);
          (0, psdWriter_1.writeUint8)(writer, g);
          (0, psdWriter_1.writeUint8)(writer, b);
        }
        const desc = {
          bounds: boundsToBounds(bounds),
          slices: []
        };
        slices.forEach((s) => {
          const slice = Object.assign(Object.assign({ sliceID: s.id, groupID: s.groupId, origin: descriptor_1.ESliceOrigin.encode(s.origin), Type: descriptor_1.ESliceType.encode(s.type), bounds: boundsToBounds(s.bounds) }, s.name ? { "Nm  ": s.name } : {}), { url: s.url, null: s.target, Msge: s.message, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horzAlign: descriptor_1.ESliceHorzAlign.encode(s.horizontalAlignment), vertAlign: descriptor_1.ESliceVertAlign.encode(s.verticalAlignment), bgColorType: descriptor_1.ESliceBGColorType.encode(s.backgroundColorType) });
          if (s.backgroundColorType === "color") {
            const { r, g, b, a } = s.backgroundColor;
            slice.bgColor = { "Rd  ": r, "Grn ": g, "Bl  ": b, alpha: a };
          }
          slice.topOutset = s.topOutset || 0;
          slice.leftOutset = s.leftOutset || 0;
          slice.bottomOutset = s.bottomOutset || 0;
          slice.rightOutset = s.rightOutset || 0;
          desc.slices.push(slice);
        });
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "slices");
      }
    );
    addHandler(1064, (target) => target.pixelAspectRatio !== void 0, (reader, target) => {
      if ((0, psdReader_1.readUint32)(reader) > 2)
        throw new Error("Invalid pixelAspectRatio version");
      target.pixelAspectRatio = { aspect: (0, psdReader_1.readFloat64)(reader) };
    }, (writer, target) => {
      (0, psdWriter_1.writeUint32)(writer, 2);
      (0, psdWriter_1.writeFloat64)(writer, target.pixelAspectRatio.aspect);
    });
    addHandler(1041, (target) => target.iccUntaggedProfile !== void 0, (reader, target) => {
      target.iccUntaggedProfile = !!(0, psdReader_1.readUint8)(reader);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.iccUntaggedProfile ? 1 : 0);
    });
    helpers_1.MOCK_HANDLERS && addHandler(
      1039,
      // ICC Profile
      // ICC Profile
      (target) => target._ir1039 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1039", left());
        target._ir1039 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1039);
      }
    );
    addHandler(1044, (target) => target.idsSeedNumber !== void 0, (reader, target) => target.idsSeedNumber = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.idsSeedNumber));
    addHandler(1036, (target) => target.thumbnail !== void 0 || target.thumbnailRaw !== void 0, (reader, target, left) => {
      const format = (0, psdReader_1.readUint32)(reader);
      const width = (0, psdReader_1.readUint32)(reader);
      const height = (0, psdReader_1.readUint32)(reader);
      (0, psdReader_1.readUint32)(reader);
      (0, psdReader_1.readUint32)(reader);
      (0, psdReader_1.readUint32)(reader);
      const bitsPerPixel = (0, psdReader_1.readUint16)(reader);
      const planes = (0, psdReader_1.readUint16)(reader);
      if (format !== 1 || bitsPerPixel !== 24 || planes !== 1) {
        reader.logMissingFeatures && reader.log(`Invalid thumbnail data (format: ${format}, bitsPerPixel: ${bitsPerPixel}, planes: ${planes})`);
        (0, psdReader_1.skipBytes)(reader, left());
        return;
      }
      const size = left();
      const data = (0, psdReader_1.readBytes)(reader, size);
      if (reader.useRawThumbnail) {
        target.thumbnailRaw = { width, height, data };
      } else if (data.byteLength) {
        target.thumbnail = (0, helpers_1.createCanvasFromData)(data);
      }
    }, (writer, target) => {
      var _a2;
      let width = 0;
      let height = 0;
      let data = new Uint8Array(0);
      if (target.thumbnailRaw) {
        width = target.thumbnailRaw.width;
        height = target.thumbnailRaw.height;
        data = target.thumbnailRaw.data;
      } else {
        try {
          const dataUrl = (_a2 = target.thumbnail.toDataURL("image/jpeg", 1)) === null || _a2 === void 0 ? void 0 : _a2.substring("data:image/jpeg;base64,".length);
          if (dataUrl) {
            data = (0, base64_js_1.toByteArray)(dataUrl);
            width = target.thumbnail.width;
            height = target.thumbnail.height;
          }
        } catch (_b2) {
        }
      }
      const bitsPerPixel = 24;
      const widthBytes = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
      const planes = 1;
      const totalSize = widthBytes * height * planes;
      const sizeAfterCompression = data.length;
      (0, psdWriter_1.writeUint32)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, width);
      (0, psdWriter_1.writeUint32)(writer, height);
      (0, psdWriter_1.writeUint32)(writer, widthBytes);
      (0, psdWriter_1.writeUint32)(writer, totalSize);
      (0, psdWriter_1.writeUint32)(writer, sizeAfterCompression);
      (0, psdWriter_1.writeUint16)(writer, bitsPerPixel);
      (0, psdWriter_1.writeUint16)(writer, planes);
      (0, psdWriter_1.writeBytes)(writer, data);
    });
    addHandler(1057, (target) => target.versionInfo !== void 0, (reader, target, left) => {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 1)
        throw new Error("Invalid versionInfo version");
      target.versionInfo = {
        hasRealMergedData: !!(0, psdReader_1.readUint8)(reader),
        writerName: (0, psdReader_1.readUnicodeString)(reader),
        readerName: (0, psdReader_1.readUnicodeString)(reader),
        fileVersion: (0, psdReader_1.readUint32)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const versionInfo = target.versionInfo;
      (0, psdWriter_1.writeUint32)(writer, 1);
      (0, psdWriter_1.writeUint8)(writer, versionInfo.hasRealMergedData ? 1 : 0);
      (0, psdWriter_1.writeUnicodeString)(writer, versionInfo.writerName);
      (0, psdWriter_1.writeUnicodeString)(writer, versionInfo.readerName);
      (0, psdWriter_1.writeUint32)(writer, versionInfo.fileVersion);
    });
    helpers_1.MOCK_HANDLERS && addHandler(
      1058,
      // EXIF data 1.
      // EXIF data 1.
      (target) => target._ir1058 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1058", left());
        target._ir1058 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1058);
      }
    );
    addHandler(7e3, (target) => target.imageReadyVariables !== void 0, (reader, target, left) => {
      target.imageReadyVariables = readUtf8String(reader, left());
    }, (writer, target) => {
      writeUtf8String(writer, target.imageReadyVariables);
    });
    addHandler(7001, (target) => target.imageReadyDataSets !== void 0, (reader, target, left) => {
      target.imageReadyDataSets = readUtf8String(reader, left());
    }, (writer, target) => {
      writeUtf8String(writer, target.imageReadyDataSets);
    });
    addHandler(1088, (target) => target.pathSelectionState !== void 0, (reader, target, _left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.pathSelectionState = desc["null"];
    }, (writer, target) => {
      const desc = { "null": target.pathSelectionState };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    helpers_1.MOCK_HANDLERS && addHandler(1025, (target) => target._ir1025 !== void 0, (reader, target, left) => {
      LOG_MOCK_HANDLERS && console.log("image resource 1025", left());
      target._ir1025 = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => {
      (0, psdWriter_1.writeBytes)(writer, target._ir1025);
    });
    var FrmD = (0, helpers_1.createEnum)("FrmD", "auto", {
      auto: "Auto",
      none: "None",
      dispose: "Disp"
    });
    addHandler(
      4e3,
      // Plug-In resource(s)
      // Plug-In resource(s)
      (target) => target.animations !== void 0,
      (reader, target, left) => {
        const key = (0, psdReader_1.readSignature)(reader);
        if (key === "mani") {
          (0, psdReader_1.checkSignature)(reader, "IRFR");
          (0, psdReader_1.readSection)(reader, 1, (left2) => {
            while (left2() > 0) {
              (0, psdReader_1.checkSignature)(reader, "8BIM");
              const key2 = (0, psdReader_1.readSignature)(reader);
              (0, psdReader_1.readSection)(reader, 1, (left3) => {
                if (key2 === "AnDs") {
                  const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                  target.animations = {
                    // desc.AFSt ???
                    frames: desc.FrIn.map((x2) => ({
                      id: x2.FrID,
                      delay: (x2.FrDl || 0) / 100,
                      dispose: x2.FrDs ? FrmD.decode(x2.FrDs) : "auto"
                      // missing == auto
                      // x.FrGA ???
                    })),
                    animations: desc.FSts.map((x2) => ({
                      id: x2.FsID,
                      frames: x2.FsFr,
                      repeats: x2.LCnt,
                      activeFrame: x2.AFrm || 0
                    }))
                  };
                } else if (key2 === "Roll") {
                  const bytes = (0, psdReader_1.readBytes)(reader, left3());
                  reader.logDevFeatures && reader.log("#4000 Roll", bytes);
                } else {
                  reader.logMissingFeatures && reader.log("Unhandled subsection in #4000", key2);
                }
              });
            }
          });
        } else if (key === "mopt") {
          const bytes = (0, psdReader_1.readBytes)(reader, left());
          reader.logDevFeatures && reader.log("#4000 mopt", bytes);
        } else {
          reader.logMissingFeatures && reader.log("Unhandled key in #4000:", key);
        }
      },
      (writer, target) => {
        if (target.animations) {
          (0, psdWriter_1.writeSignature)(writer, "mani");
          (0, psdWriter_1.writeSignature)(writer, "IRFR");
          (0, psdWriter_1.writeSection)(writer, 1, () => {
            (0, psdWriter_1.writeSignature)(writer, "8BIM");
            (0, psdWriter_1.writeSignature)(writer, "AnDs");
            (0, psdWriter_1.writeSection)(writer, 1, () => {
              const desc = {
                // AFSt: 0, // ???
                FrIn: [],
                FSts: []
              };
              for (let i2 = 0; i2 < target.animations.frames.length; i2++) {
                const f = target.animations.frames[i2];
                const frame = {
                  FrID: f.id
                };
                if (f.delay)
                  frame.FrDl = f.delay * 100 | 0;
                frame.FrDs = FrmD.encode(f.dispose);
                desc.FrIn.push(frame);
              }
              for (let i2 = 0; i2 < target.animations.animations.length; i2++) {
                const a = target.animations.animations[i2];
                const anim = {
                  FsID: a.id,
                  AFrm: a.activeFrame | 0,
                  FsFr: a.frames,
                  LCnt: a.repeats | 0
                };
                desc.FSts.push(anim);
              }
              (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
            });
          });
        }
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      4001,
      // Plug-In resource(s)
      // Plug-In resource(s)
      (target) => target._ir4001 !== void 0,
      (reader, target, left) => {
        if (helpers_1.MOCK_HANDLERS) {
          LOG_MOCK_HANDLERS && console.log("image resource 4001", left());
          target._ir4001 = (0, psdReader_1.readBytes)(reader, left());
          return;
        }
        const key = (0, psdReader_1.readSignature)(reader);
        if (key === "mfri") {
          const version = (0, psdReader_1.readUint32)(reader);
          if (version !== 2)
            throw new Error("Invalid mfri version");
          const length = (0, psdReader_1.readUint32)(reader);
          const bytes = (0, psdReader_1.readBytes)(reader, length);
          reader.logDevFeatures && reader.log("mfri", bytes);
        } else if (key === "mset") {
          const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
          reader.logDevFeatures && reader.log("mset", desc);
        } else {
          reader.logMissingFeatures && reader.log("Unhandled key in #4001", key);
        }
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir4001);
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      4002,
      // Plug-In resource(s)
      // Plug-In resource(s)
      (target) => target._ir4002 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 4002", left());
        target._ir4002 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir4002);
      }
    );
  }
});

// node_modules/ag-psd/dist/psdReader.js
var require_psdReader = __commonJS({
  "node_modules/ag-psd/dist/psdReader.js"(exports) {
    "use strict";
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i2 = 0, p = Object.getOwnPropertySymbols(s); i2 < p.length; i2++) {
          if (e.indexOf(p[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i2]))
            t[p[i2]] = s[p[i2]];
        }
      return t;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.supportedColorModes = void 0;
    exports.createReader = createReader;
    exports.warnOrThrow = warnOrThrow;
    exports.readUint8 = readUint8;
    exports.peekUint8 = peekUint8;
    exports.readInt16 = readInt16;
    exports.readUint16 = readUint16;
    exports.readUint16LE = readUint16LE;
    exports.readInt32 = readInt32;
    exports.readInt32LE = readInt32LE;
    exports.readUint32 = readUint32;
    exports.readFloat32 = readFloat32;
    exports.readFloat64 = readFloat64;
    exports.readFixedPoint32 = readFixedPoint32;
    exports.readFixedPointPath32 = readFixedPointPath32;
    exports.readBytes = readBytes;
    exports.readSignature = readSignature;
    exports.validSignatureAt = validSignatureAt;
    exports.readPascalString = readPascalString;
    exports.readUnicodeString = readUnicodeString;
    exports.readUnicodeStringWithLength = readUnicodeStringWithLength;
    exports.readUnicodeStringWithLengthLE = readUnicodeStringWithLengthLE;
    exports.readAsciiString = readAsciiString;
    exports.skipBytes = skipBytes;
    exports.checkSignature = checkSignature;
    exports.readPsd = readPsd;
    exports.readLayerInfo = readLayerInfo;
    exports.getCompositeImageData = getCompositeImageData;
    exports.getCompositeCanvas = getCompositeCanvas;
    exports.getLayerImageData = getLayerImageData;
    exports.getLayerMaskImageData = getLayerMaskImageData;
    exports.getLayerRealMaskImageData = getLayerRealMaskImageData;
    exports.getLayerCanvas = getLayerCanvas;
    exports.getLayerMaskCanvas = getLayerMaskCanvas;
    exports.getLayerRealMaskCanvas = getLayerRealMaskCanvas;
    exports.decodeLayerPixels = decodeLayerPixels;
    exports.readGlobalLayerMaskInfo = readGlobalLayerMaskInfo;
    exports.readAdditionalLayerInfo = readAdditionalLayerInfo;
    exports.readDataZip = readDataZip;
    exports.readDataRLE = readDataRLE;
    exports.readSection = readSection;
    exports.readColor = readColor;
    exports.readPattern = readPattern;
    var pako_1 = require_pako();
    var helpers_1 = require_helpers();
    var additionalInfo_1 = require_additionalInfo();
    var imageResources_1 = require_imageResources();
    exports.supportedColorModes = [
      0,
      1,
      3,
      2
      /* ColorMode.Indexed */
    ];
    var colorModes = ["bitmap", "grayscale", "indexed", "RGB", "CMYK", "", "", "multichannel", "duotone", "lab"];
    function setupGrayscale(data) {
      const size = data.width * data.height * 4;
      for (let i2 = 0; i2 < size; i2 += 4) {
        const c = data.data[i2];
        data.data[i2 + 1] = c;
        data.data[i2 + 2] = c;
      }
    }
    function createReader(buffer, offset, length) {
      const view = new DataView(buffer, offset, length);
      return { view, offset: 0, strict: false, debug: false, large: false, globalAlpha: false, log: console.log };
    }
    function warnOrThrow(reader, message) {
      if (reader.strict)
        throw new Error(message);
      if (reader.debug)
        reader.log(message);
    }
    function readUint8(reader) {
      reader.offset += 1;
      return reader.view.getUint8(reader.offset - 1);
    }
    function peekUint8(reader) {
      return reader.view.getUint8(reader.offset);
    }
    function readInt16(reader) {
      reader.offset += 2;
      return reader.view.getInt16(reader.offset - 2, false);
    }
    function readUint16(reader) {
      reader.offset += 2;
      return reader.view.getUint16(reader.offset - 2, false);
    }
    function readUint16LE(reader) {
      reader.offset += 2;
      return reader.view.getUint16(reader.offset - 2, true);
    }
    function readInt32(reader) {
      reader.offset += 4;
      return reader.view.getInt32(reader.offset - 4, false);
    }
    function readInt32LE(reader) {
      reader.offset += 4;
      return reader.view.getInt32(reader.offset - 4, true);
    }
    function readUint32(reader) {
      reader.offset += 4;
      return reader.view.getUint32(reader.offset - 4, false);
    }
    function readFloat32(reader) {
      reader.offset += 4;
      return reader.view.getFloat32(reader.offset - 4, false);
    }
    function readFloat64(reader) {
      reader.offset += 8;
      return reader.view.getFloat64(reader.offset - 8, false);
    }
    function readFixedPoint32(reader) {
      return readInt32(reader) / (1 << 16);
    }
    function readFixedPointPath32(reader) {
      return readInt32(reader) / (1 << 24);
    }
    function readBytes(reader, length) {
      const start = reader.view.byteOffset + reader.offset;
      reader.offset += length;
      if (start + length > reader.view.buffer.byteLength) {
        warnOrThrow(reader, "Reading bytes exceeding buffer length");
        if (length > 100 * 1024 * 1024)
          throw new Error("Reading past end of file");
        const result = new Uint8Array(length);
        const len = Math.min(length, reader.view.byteLength - start);
        if (len > 0)
          result.set(new Uint8Array(reader.view.buffer, start, len));
        return result;
      } else {
        return new Uint8Array(reader.view.buffer, start, length);
      }
    }
    function readSignature(reader) {
      return readShortString(reader, 4);
    }
    function validSignatureAt(reader, offset) {
      const sig = String.fromCharCode(reader.view.getUint8(offset)) + String.fromCharCode(reader.view.getUint8(offset + 1)) + String.fromCharCode(reader.view.getUint8(offset + 2)) + String.fromCharCode(reader.view.getUint8(offset + 3));
      return sig == "8BIM" || sig == "8B64";
    }
    function readPascalString(reader, padTo) {
      let length = readUint8(reader);
      const text = length ? readShortString(reader, length) : "";
      while (++length % padTo) {
        reader.offset++;
      }
      return text;
    }
    function readUnicodeString(reader) {
      const length = readUint32(reader);
      return readUnicodeStringWithLength(reader, length);
    }
    function readUnicodeStringWithLength(reader, length) {
      let text = "";
      while (length--) {
        const value = readUint16(reader);
        if (value || length > 0) {
          text += String.fromCharCode(value);
        }
      }
      return text;
    }
    function readUnicodeStringWithLengthLE(reader, length) {
      let text = "";
      while (length--) {
        const value = readUint16LE(reader);
        if (value || length > 0) {
          text += String.fromCharCode(value);
        }
      }
      return text;
    }
    function readAsciiString(reader, length) {
      let text = "";
      while (length--) {
        text += String.fromCharCode(readUint8(reader));
      }
      return text;
    }
    function skipBytes(reader, count) {
      reader.offset += count;
    }
    function checkSignature(reader, a, b) {
      const offset = reader.offset;
      const signature = readSignature(reader);
      if (signature !== a && signature !== b) {
        throw new Error(`Invalid signature: '${signature}' at 0x${offset.toString(16)}`);
      }
    }
    function readShortString(reader, length) {
      const buffer = readBytes(reader, length);
      let result = "";
      for (let i2 = 0; i2 < buffer.length; i2++) {
        result += String.fromCharCode(buffer[i2]);
      }
      return result;
    }
    function isValidSignature(sig) {
      return sig === "8BIM" || sig === "MeSa" || sig === "AgHg" || sig === "PHUT" || sig === "DCSR";
    }
    function readPsd(reader, readOptions = {}) {
      var _a2;
      checkSignature(reader, "8BPS");
      const version = readUint16(reader);
      if (version !== 1 && version !== 2)
        throw new Error(`Invalid PSD file version: ${version}`);
      skipBytes(reader, 6);
      const channels = readUint16(reader);
      const height = readUint32(reader);
      const width = readUint32(reader);
      const bitsPerChannel = readUint16(reader);
      const colorMode = readUint16(reader);
      const maxSize = version === 1 ? 3e4 : 3e5;
      if (width > maxSize || height > maxSize)
        throw new Error(`Invalid size: ${width}x${height}`);
      if (channels > 16)
        throw new Error(`Invalid channel count: ${channels}`);
      if (![1, 8, 16, 32].includes(bitsPerChannel))
        throw new Error(`Invalid bitsPerChannel: ${bitsPerChannel}`);
      if (exports.supportedColorModes.indexOf(colorMode) === -1)
        throw new Error(`Color mode not supported: ${(_a2 = colorModes[colorMode]) !== null && _a2 !== void 0 ? _a2 : colorMode}`);
      const psd = { width, height, channels, bitsPerChannel, colorMode };
      Object.assign(reader, readOptions);
      reader.large = version === 2;
      reader.globalAlpha = false;
      if (!("totalMemoryLimit" in reader)) {
        reader.totalMemoryLimit = 2 * 1024 * 1024 * 1024;
      }
      readSection(reader, 1, (left) => {
        if (!left())
          return;
        if (colorMode === 2) {
          if (left() != 768)
            throw new Error("Invalid color palette size");
          psd.palette = [];
          for (let i2 = 0; i2 < 256; i2++)
            psd.palette.push({ r: readUint8(reader), g: 0, b: 0 });
          for (let i2 = 0; i2 < 256; i2++)
            psd.palette[i2].g = readUint8(reader);
          for (let i2 = 0; i2 < 256; i2++)
            psd.palette[i2].b = readUint8(reader);
        } else {
        }
        skipBytes(reader, left());
      });
      const imageResources = {};
      readSection(reader, 1, (left) => {
        while (left() > 0) {
          realignWithSignature(reader, isValidSignature);
          const id = readUint16(reader);
          readPascalString(reader, 2);
          readSection(reader, 2, (left2) => {
            const handler = imageResources_1.resourceHandlersMap[id];
            const skip = id === 1036 && !!reader.skipThumbnail;
            if (handler && !skip) {
              try {
                handler.read(reader, imageResources, left2);
              } catch (e) {
                if (reader.throwForMissingFeatures)
                  throw e;
                skipBytes(reader, left2());
              }
            } else {
              skipBytes(reader, left2());
            }
          });
        }
      });
      const { layersGroup, layerGroupsEnabledId } = imageResources, rest = __rest(imageResources, ["layersGroup", "layerGroupsEnabledId"]);
      if (Object.keys(rest).length) {
        psd.imageResources = rest;
      }
      readSection(reader, 1, (left) => {
        readSection(reader, 2, (left2) => {
          readLayerInfo(reader, psd, imageResources);
          skipBytes(reader, left2());
        }, void 0, reader.large);
        if (left() > 0) {
          const globalLayerMaskInfo = readGlobalLayerMaskInfo(reader);
          if (globalLayerMaskInfo)
            psd.globalLayerMaskInfo = globalLayerMaskInfo;
        } else {
          skipBytes(reader, left());
        }
        while (left() > 0) {
          while (left() && peekUint8(reader) === 0) {
            skipBytes(reader, 1);
          }
          if (left() >= 12) {
            readAdditionalLayerInfo(reader, psd, psd, imageResources);
          } else {
            skipBytes(reader, left());
          }
        }
      }, void 0, reader.large);
      const hasChildren = psd.children && psd.children.length;
      const skipComposite = reader.skipCompositeImageData && (reader.skipLayerImageData || hasChildren);
      if (!skipComposite) {
        if (reader.useRawData) {
          psd.rawCompositeData = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset);
        } else {
          const imageData = readImageData(reader, psd);
          if (reader.useImageData) {
            psd.imageData = imageData;
          } else {
            psd.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
          }
        }
      }
      return psd;
    }
    function readLayerInfo(reader, psd, imageResources) {
      var _a2, _b2;
      const { layersGroup = [], layerGroupsEnabledId = [] } = imageResources;
      let layerCount = readInt16(reader);
      if (layerCount < 0) {
        reader.globalAlpha = true;
        layerCount = -layerCount;
      }
      const layers = [];
      const layerChannels = [];
      for (let i2 = 0; i2 < layerCount; i2++) {
        const { layer, channels } = readLayerRecord(reader, psd, imageResources);
        if (layersGroup[i2] !== void 0)
          layer.linkGroup = layersGroup[i2];
        if (layerGroupsEnabledId[i2] !== void 0)
          layer.linkGroupEnabled = !!layerGroupsEnabledId[i2];
        layers.push(layer);
        layerChannels.push(channels);
      }
      for (let i2 = 0; i2 < layerCount; i2++) {
        readLayerChannelImageData(reader, psd, layers[i2], layerChannels[i2]);
      }
      if (!psd.children)
        psd.children = [];
      const stack = [psd];
      for (let i2 = layers.length - 1; i2 >= 0; i2--) {
        const l = layers[i2];
        const type = l.sectionDivider ? l.sectionDivider.type : 0;
        if (type === 1 || type === 2) {
          l.opened = type === 1;
          l.children = [];
          if ((_a2 = l.sectionDivider) === null || _a2 === void 0 ? void 0 : _a2.key) {
            l.blendMode = (_b2 = helpers_1.toBlendMode[l.sectionDivider.key]) !== null && _b2 !== void 0 ? _b2 : l.blendMode;
          }
          stack[stack.length - 1].children.unshift(l);
          stack.push(l);
        } else if (type === 3) {
          stack.pop();
        } else {
          stack[stack.length - 1].children.unshift(l);
        }
      }
    }
    function readLayerRecord(reader, psd, imageResources) {
      const layer = {};
      layer.top = readInt32(reader);
      layer.left = readInt32(reader);
      layer.bottom = readInt32(reader);
      layer.right = readInt32(reader);
      if (!isValidBoxSize(layer, reader))
        throw new Error("Invalid layer size");
      const channelCount = readUint16(reader);
      const channels = [];
      for (let i2 = 0; i2 < channelCount; i2++) {
        let id = readInt16(reader);
        let length = readUint32(reader);
        if (reader.large) {
          if (length !== 0)
            throw new Error("Sizes larger than 4GB are not supported");
          length = readUint32(reader);
        }
        channels.push({ id, length });
      }
      checkSignature(reader, "8BIM");
      const blendMode = readSignature(reader);
      if (!helpers_1.toBlendMode[blendMode])
        throw new Error(`Invalid blend mode: '${blendMode}'`);
      layer.blendMode = helpers_1.toBlendMode[blendMode];
      layer.opacity = readUint8(reader) / 255;
      layer.clipping = readUint8(reader) === 1;
      const flags = readUint8(reader);
      layer.transparencyProtected = (flags & 1) !== 0;
      layer.hidden = (flags & 2) !== 0;
      if (flags & 32)
        layer.effectsOpen = true;
      skipBytes(reader, 1);
      readSection(reader, 1, (left) => {
        readLayerMaskData(reader, layer);
        const blendingRanges = readLayerBlendingRanges(reader);
        if (blendingRanges)
          layer.blendingRanges = blendingRanges;
        layer.name = readPascalString(reader, 1);
        while (left() > 4 && !validSignatureAt(reader, reader.offset))
          reader.offset++;
        while (left() >= 12)
          readAdditionalLayerInfo(reader, layer, psd, imageResources);
        skipBytes(reader, left());
      });
      return { layer, channels };
    }
    function isValidBoxSize(box, reader) {
      const width = (box.right || 0) - (box.left || 0);
      const height = (box.bottom || 0) - (box.top || 0);
      const maxSize = reader.large ? 3e5 : 3e4;
      return width >= 0 && height >= 0 && width <= maxSize && height <= maxSize;
    }
    function readLayerMaskData(reader, layer) {
      return readSection(reader, 1, (left) => {
        if (!left())
          return void 0;
        const mask = {};
        layer.mask = mask;
        mask.top = readInt32(reader);
        mask.left = readInt32(reader);
        mask.bottom = readInt32(reader);
        mask.right = readInt32(reader);
        if (!isValidBoxSize(mask, reader))
          throw new Error("Invalid mask size");
        mask.defaultColor = readUint8(reader);
        const flags = readUint8(reader);
        mask.positionRelativeToLayer = (flags & 1) !== 0;
        mask.disabled = (flags & 2) !== 0;
        mask.fromVectorData = (flags & 8) !== 0;
        if (left() >= 18) {
          const realMask = {};
          layer.realMask = realMask;
          const realFlags = readUint8(reader);
          realMask.positionRelativeToLayer = (realFlags & 1) !== 0;
          realMask.disabled = (realFlags & 2) !== 0;
          realMask.fromVectorData = (realFlags & 8) !== 0;
          realMask.defaultColor = readUint8(reader);
          realMask.top = readInt32(reader);
          realMask.left = readInt32(reader);
          realMask.bottom = readInt32(reader);
          realMask.right = readInt32(reader);
          if (!isValidBoxSize(realMask, reader))
            throw new Error("Invalid realMask size");
        }
        if (flags & 16) {
          const params = readUint8(reader);
          if (params & 1)
            mask.userMaskDensity = readUint8(reader) / 255;
          if (params & 2)
            mask.userMaskFeather = readFloat64(reader);
          if (params & 4)
            mask.vectorMaskDensity = readUint8(reader) / 255;
          if (params & 8)
            mask.vectorMaskFeather = readFloat64(reader);
        }
        skipBytes(reader, left());
      });
    }
    function readBlendingRange(reader) {
      return [readUint8(reader), readUint8(reader), readUint8(reader), readUint8(reader)];
    }
    function readLayerBlendingRanges(reader) {
      return readSection(reader, 1, (left) => {
        const compositeGrayBlendSource = readBlendingRange(reader);
        const compositeGraphBlendDestinationRange = readBlendingRange(reader);
        const ranges = [];
        while (left() > 0) {
          const sourceRange = readBlendingRange(reader);
          const destRange = readBlendingRange(reader);
          ranges.push({ sourceRange, destRange });
        }
        return { compositeGrayBlendSource, compositeGraphBlendDestinationRange, ranges };
      });
    }
    function readLayerChannelImageData(reader, psd, layer, channels) {
      if (reader.skipLayerImageData)
        return;
      const { colorMode = 3, bitsPerChannel = 8 } = psd;
      layer.rawData = { colorMode, bitsPerChannel, channels: [], large: reader.large };
      for (const channel of channels) {
        const start = reader.offset;
        let compression = 0;
        let data = void 0;
        if (channel.length === 1)
          throw new Error("Invalid channel length");
        if (channel.length) {
          compression = readUint16(reader);
          if (compression > 3) {
            reader.offset -= 1;
            compression = readUint16(reader);
          }
          if (compression > 3) {
            reader.offset -= 3;
            compression = readUint16(reader);
          }
          if (compression > 3)
            throw new Error(`Invalid compression: ${compression}`);
          if (channel.length > 2) {
            data = readBytes(reader, channel.length - 2);
          }
        }
        reader.offset = start + channel.length;
        layer.rawData.channels.push({ id: channel.id, compression, data });
      }
      if (!reader.useRawData) {
        decodeLayerImageData(layer, reader);
      }
    }
    function resetAlpha({ data }, cmyk) {
      const alpha = data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;
      const offset = (cmyk ? 4 : 3) | 0;
      const length = data.length | 0;
      const step = (cmyk ? 5 : 4) | 0;
      for (let p = offset; p < length; p = p + step | 0) {
        data[p] = alpha;
      }
    }
    function getCompositeImageData(psd) {
      const data = psd.rawCompositeData;
      if (!data)
        return void 0;
      const reader = createReader(data.buffer, data.byteOffset, data.byteLength);
      const imageData = readImageData(reader, psd);
      return imageData;
    }
    function getCompositeCanvas(psd) {
      return imageDataToCanvasSafe(getCompositeImageData(psd));
    }
    function getLayerImageData(layer) {
      return getDataFromLayer(layer, LayerDataType.Layer, false, void 0);
    }
    function getLayerMaskImageData(layer) {
      return getDataFromLayer(layer, LayerDataType.Mask, false, void 0);
    }
    function getLayerRealMaskImageData(layer) {
      return getDataFromLayer(layer, LayerDataType.RealMask, false, void 0);
    }
    function getLayerCanvas(layer) {
      return imageDataToCanvasSafe(getLayerImageData(layer));
    }
    function getLayerMaskCanvas(layer) {
      return imageDataToCanvasSafe(getLayerMaskImageData(layer));
    }
    function getLayerRealMaskCanvas(layer) {
      return imageDataToCanvasSafe(getLayerRealMaskImageData(layer));
    }
    function imageDataToCanvasSafe(imageData) {
      return imageData && (0, helpers_1.imageDataToCanvas)(imageData);
    }
    function setImageDataOrCanvas(obj, imageData, useImageData) {
      if (!imageData)
        return;
      if (useImageData) {
        obj.imageData = imageData;
      } else {
        obj.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
      }
    }
    function decodeLayerPixels(layer, useImageData) {
      decodeLayerImageData(layer, { useImageData });
    }
    function decodeLayerImageData(layer, options) {
      var _a2, _b2, _c;
      let { throwForMissingFeatures, useImageData } = options;
      const imageData = getDataFromLayer(layer, LayerDataType.Layer, throwForMissingFeatures, options.totalMemoryLimit);
      setImageDataOrCanvas(layer, imageData, useImageData);
      if (options.totalMemoryLimit !== void 0)
        options.totalMemoryLimit -= (_a2 = imageData === null || imageData === void 0 ? void 0 : imageData.data.byteLength) !== null && _a2 !== void 0 ? _a2 : 0;
      if (layer.mask) {
        const maskData = getDataFromLayer(layer, LayerDataType.Mask, throwForMissingFeatures, options.totalMemoryLimit);
        setImageDataOrCanvas(layer.mask, maskData, useImageData);
        if (options.totalMemoryLimit !== void 0)
          options.totalMemoryLimit -= (_b2 = maskData === null || maskData === void 0 ? void 0 : maskData.data.byteLength) !== null && _b2 !== void 0 ? _b2 : 0;
      }
      if (layer.realMask) {
        const maskData = getDataFromLayer(layer, LayerDataType.RealMask, throwForMissingFeatures, options.totalMemoryLimit);
        setImageDataOrCanvas(layer.realMask, maskData, useImageData);
        if (options.totalMemoryLimit !== void 0)
          options.totalMemoryLimit -= (_c = maskData === null || maskData === void 0 ? void 0 : maskData.data.byteLength) !== null && _c !== void 0 ? _c : 0;
      }
      delete layer.rawData;
    }
    var LayerDataType;
    (function(LayerDataType2) {
      LayerDataType2[LayerDataType2["Layer"] = 0] = "Layer";
      LayerDataType2[LayerDataType2["Mask"] = 1] = "Mask";
      LayerDataType2[LayerDataType2["RealMask"] = 2] = "RealMask";
    })(LayerDataType || (LayerDataType = {}));
    function getDataFromLayer(layer, read, throwForMissingFeatures, memoryLimit) {
      if (!layer.rawData)
        return void 0;
      const { colorMode, bitsPerChannel, channels, large } = layer.rawData;
      const layerWidth = Math.max(0, (layer.right || 0) - (layer.left || 0));
      const layerHeight = Math.max(0, (layer.bottom || 0) - (layer.top || 0));
      const cmyk = colorMode === 4;
      let imageData;
      let maskData;
      let initializedAlpha = false;
      if (layerWidth && layerHeight && read === LayerDataType.Layer) {
        if (cmyk) {
          if (bitsPerChannel !== 8)
            throw new Error("bitsPerChannel Not supproted");
          imageData = { width: layerWidth, height: layerHeight, data: new Uint8ClampedArray(layerWidth * layerHeight * 5) };
        } else {
          imageData = createImageDataBitDepth(layerWidth, layerHeight, bitsPerChannel, 4, memoryLimit);
        }
      }
      if (helpers_1.RAW_IMAGE_DATA) {
        layer.imageDataRaw = [];
        layer.imageDataRawCompression = [];
      }
      for (const { id, compression, data } of channels) {
        if (!data)
          continue;
        const dataReader = createReader(data.buffer, data.byteOffset, data.byteLength);
        if (id === -2 || id === -3) {
          if (id === -2 && read !== LayerDataType.Mask)
            continue;
          if (id === -3 && read !== LayerDataType.RealMask)
            continue;
          const mask = id === -2 ? layer.mask : layer.realMask;
          if (!mask)
            throw new Error(`Missing layer ${id === -2 ? "mask" : "real mask"} data`);
          const maskWidth = Math.max(0, (mask.right || 0) - (mask.left || 0));
          const maskHeight = Math.max(0, (mask.bottom || 0) - (mask.top || 0));
          if (maskWidth && maskHeight) {
            maskData = createImageDataBitDepth(maskWidth, maskHeight, bitsPerChannel, 4, memoryLimit);
            readData(dataReader, data.byteLength, maskData, compression, maskWidth, maskHeight, bitsPerChannel, 0, large, 4);
            if (helpers_1.RAW_IMAGE_DATA) {
              if (id === -2) {
                layer.maskDataRawCompression = compression;
                layer.maskDataRaw = data;
              } else {
                layer.realMaskDataRawCompression = compression;
                layer.realMaskDataRaw = data;
              }
            }
            setupGrayscale(maskData);
            resetAlpha(maskData, false);
          }
        } else {
          if (read !== LayerDataType.Layer)
            continue;
          const offset = (0, helpers_1.offsetForChannel)(id, cmyk);
          let targetData = imageData;
          if (offset < 0) {
            targetData = void 0;
            if (throwForMissingFeatures) {
              throw new Error(`Channel not supported: ${id}`);
            }
          }
          readData(dataReader, data.byteLength, targetData, compression, layerWidth, layerHeight, bitsPerChannel, offset, large, cmyk ? 5 : 4);
          if (helpers_1.RAW_IMAGE_DATA) {
            layer.imageDataRawCompression[id] = compression;
            layer.imageDataRaw[id] = data;
          }
          if (targetData && colorMode === 1) {
            setupGrayscale(targetData);
          }
        }
        if (id === -1) {
          initializedAlpha = true;
        }
      }
      if (imageData) {
        if (!initializedAlpha)
          resetAlpha(imageData, cmyk);
        if (cmyk) {
          const cmykData = imageData;
          imageData = (0, helpers_1.createImageData)(cmykData.width, cmykData.height);
          cmykToRgb(cmykData, imageData, false);
        }
      }
      return read === LayerDataType.Layer ? imageData : maskData;
    }
    function readData(reader, length, pixels, compression, width, height, bitDepth, offset, large, step) {
      if (!length)
        return;
      if (compression === 0) {
        if (length !== width * height * Math.floor(bitDepth / 8)) {
          reader.log(`Invalid length (${length}, ${width * height * Math.floor(bitDepth / 8)})`);
        }
        const data = readBytes(reader, length);
        readDataRaw(data, pixels, bitDepth, step, offset);
      } else if (compression === 1) {
        readDataRLE(reader, pixels, width, height, bitDepth, step, [offset], large);
      } else if (compression === 2) {
        const data = readBytes(reader, length);
        readDataZip(data, pixels, width, height, bitDepth, step, offset, false);
      } else if (compression === 3) {
        const data = readBytes(reader, length);
        readDataZip(data, pixels, width, height, bitDepth, step, offset, true);
      } else {
        throw new Error(`Invalid Compression type: ${compression}`);
      }
    }
    function readGlobalLayerMaskInfo(reader) {
      return readSection(reader, 1, (left) => {
        if (!left())
          return void 0;
        const overlayColorSpace = readUint16(reader);
        const colorSpace1 = readUint16(reader);
        const colorSpace2 = readUint16(reader);
        const colorSpace3 = readUint16(reader);
        const colorSpace4 = readUint16(reader);
        const opacity = readUint16(reader) / 255;
        const kind = readUint8(reader);
        skipBytes(reader, left());
        return { overlayColorSpace, colorSpace1, colorSpace2, colorSpace3, colorSpace4, opacity, kind };
      });
    }
    var fixOffsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    function realignWithSignature(reader, isValid) {
      const sigOffset = reader.offset;
      let sig = "";
      for (const offset of fixOffsets) {
        try {
          reader.offset = sigOffset + offset;
          sig = readSignature(reader);
        } catch (_a2) {
        }
        if (isValid(sig))
          break;
      }
      if (!isValid(sig)) {
        throw new Error(`Invalid signature: '${sig}' at 0x${sigOffset.toString(16)}`);
      }
      return sig;
    }
    function isValidAdditionalInfoSignature(sig) {
      return sig === "8BIM" || sig === "8B64";
    }
    function readAdditionalLayerInfo(reader, target, psd, imageResources) {
      const sig = realignWithSignature(reader, isValidAdditionalInfoSignature);
      const key = readSignature(reader);
      const u64 = sig === "8B64" || reader.large && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1;
      readSection(reader, 2, (left) => {
        const handler = additionalInfo_1.infoHandlersMap[key];
        if (handler) {
          try {
            handler.read(reader, target, left, psd, imageResources);
          } catch (e) {
            if (reader.throwForMissingFeatures)
              throw e;
          }
        } else {
          reader.logMissingFeatures && reader.log(`Unhandled additional info: ${key}`);
          skipBytes(reader, left());
        }
        if (left()) {
          reader.logMissingFeatures && reader.log(`Unread ${left()} bytes left for additional info: ${key}`);
          skipBytes(reader, left());
        }
      }, false, u64);
    }
    function createImageDataBitDepth(width, height, bitDepth, channels, memoryLimit) {
      const sizeInBytes = width * height * channels * Math.max(1, bitDepth / 8);
      if (memoryLimit !== void 0 && sizeInBytes > memoryLimit)
        throw new Error("Exceeded memory limit");
      if (bitDepth === 1 || bitDepth === 8) {
        if (channels === 4) {
          return (0, helpers_1.createImageData)(width, height);
        } else {
          return { width, height, data: new Uint8ClampedArray(width * height * channels) };
        }
      } else if (bitDepth === 16) {
        return { width, height, data: new Uint16Array(width * height * channels) };
      } else if (bitDepth === 32) {
        return { width, height, data: new Float32Array(width * height * channels) };
      } else {
        throw new Error(`Invalid bitDepth (${bitDepth})`);
      }
    }
    function readImageData(reader, psd) {
      var _a2;
      const compression = readUint16(reader);
      const bitsPerChannel = (_a2 = psd.bitsPerChannel) !== null && _a2 !== void 0 ? _a2 : 8;
      if (exports.supportedColorModes.indexOf(psd.colorMode) === -1)
        throw new Error(`Color mode not supported: ${psd.colorMode}`);
      if (compression !== 0 && compression !== 1)
        throw new Error(`Compression type not supported: ${compression}`);
      const imageData = createImageDataBitDepth(psd.width, psd.height, bitsPerChannel, 4, reader.totalMemoryLimit);
      if (reader.totalMemoryLimit !== void 0)
        reader.totalMemoryLimit -= imageData.data.byteLength;
      (0, helpers_1.resetImageData)(imageData);
      switch (psd.colorMode) {
        case 0: {
          if (bitsPerChannel !== 1)
            throw new Error("Invalid bitsPerChannel for bitmap color mode");
          let bytes;
          if (compression === 0) {
            bytes = readBytes(reader, Math.ceil(psd.width / 8) * psd.height);
          } else if (compression === 1) {
            bytes = new Uint8Array(psd.width * psd.height);
            readDataRLE(reader, { data: bytes, width: psd.width, height: psd.height }, psd.width, psd.height, 8, 1, [0], reader.large);
          } else {
            throw new Error(`Compression not supported: ${compression}`);
          }
          (0, helpers_1.decodeBitmap)(bytes, imageData.data, psd.width, psd.height);
          break;
        }
        case 3:
        case 1: {
          const channels = psd.colorMode === 1 ? [0] : [0, 1, 2];
          if (psd.channels && psd.channels > 3) {
            for (let i2 = 3; i2 < psd.channels; i2++) {
              channels.push(i2);
            }
          } else if (reader.globalAlpha) {
            channels.push(3);
          }
          if (compression === 0) {
            for (let i2 = 0; i2 < channels.length; i2++) {
              const data = readBytes(reader, psd.width * psd.height * Math.floor(bitsPerChannel / 8));
              readDataRaw(data, imageData, bitsPerChannel, 4, channels[i2]);
            }
          } else if (compression === 1) {
            const start = reader.offset;
            readDataRLE(reader, imageData, psd.width, psd.height, bitsPerChannel, 4, channels, reader.large);
            if (helpers_1.RAW_IMAGE_DATA)
              psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
          } else {
            throw new Error(`Compression not supported: ${compression}`);
          }
          if (psd.colorMode === 1) {
            setupGrayscale(imageData);
          }
          break;
        }
        case 2: {
          if (bitsPerChannel !== 8)
            throw new Error("bitsPerChannel Not supproted");
          if (psd.channels !== 1)
            throw new Error("Invalid channel count");
          if (!psd.palette)
            throw new Error("Missing color palette");
          if (compression === 0) {
            throw new Error(`Compression not supported: ${compression}`);
          } else if (compression === 1) {
            const indexedImageData = {
              width: imageData.width,
              height: imageData.height,
              data: new Uint8Array(imageData.width * imageData.height)
            };
            readDataRLE(reader, indexedImageData, psd.width, psd.height, bitsPerChannel, 1, [0], reader.large);
            indexedToRgb(indexedImageData, imageData, psd.palette);
          } else {
            throw new Error(`Compression not supported: ${compression}`);
          }
          break;
        }
        case 4: {
          if (bitsPerChannel !== 8)
            throw new Error("bitsPerChannel Not supproted");
          if (psd.channels !== 4)
            throw new Error(`Invalid channel count`);
          const channels = [0, 1, 2, 3];
          if (reader.globalAlpha)
            channels.push(4);
          if (compression === 0) {
            throw new Error(`Compression not supported: ${compression}`);
          } else if (compression === 1) {
            const cmykImageData = {
              width: imageData.width,
              height: imageData.height,
              data: new Uint8Array(imageData.width * imageData.height * 5)
            };
            const start = reader.offset;
            readDataRLE(reader, cmykImageData, psd.width, psd.height, bitsPerChannel, 5, channels, reader.large);
            cmykToRgb(cmykImageData, imageData, true);
            if (helpers_1.RAW_IMAGE_DATA)
              psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
          } else {
            throw new Error(`Compression not supported: ${compression}`);
          }
          break;
        }
        default:
          throw new Error(`Color mode not supported: ${psd.colorMode}`);
      }
      if (reader.globalAlpha) {
        if (psd.bitsPerChannel !== 8)
          throw new Error("bitsPerChannel Not supproted");
        const p = imageData.data;
        const size = imageData.width * imageData.height * 4;
        for (let i2 = 0; i2 < size; i2 += 4) {
          const pa = p[i2 + 3];
          if (pa != 0 && pa != 255) {
            const a = pa / 255;
            const ra = 1 / a;
            const invA = 255 * (1 - ra);
            p[i2 + 0] = p[i2 + 0] * ra + invA;
            p[i2 + 1] = p[i2 + 1] * ra + invA;
            p[i2 + 2] = p[i2 + 2] * ra + invA;
          }
        }
      }
      return imageData;
    }
    function cmykToRgb(cmyk, rgb, reverseAlpha) {
      const size = rgb.width * rgb.height * 4;
      const srcData = cmyk.data;
      const dstData = rgb.data;
      for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
        const c = srcData[src];
        const m = srcData[src + 1];
        const y = srcData[src + 2];
        const k = srcData[src + 3];
        dstData[dst] = (c * k | 0) / 255 | 0;
        dstData[dst + 1] = (m * k | 0) / 255 | 0;
        dstData[dst + 2] = (y * k | 0) / 255 | 0;
        dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
      }
    }
    function indexedToRgb(indexed, rgb, palette) {
      const size = indexed.width * indexed.height;
      const srcData = indexed.data;
      const dstData = rgb.data;
      for (let src = 0, dst = 0; src < size; src++, dst += 4) {
        const c = palette[srcData[src]];
        dstData[dst + 0] = c.r;
        dstData[dst + 1] = c.g;
        dstData[dst + 2] = c.b;
        dstData[dst + 3] = 255;
      }
    }
    function verifyCompatible(a, b) {
      if (a.byteLength / a.length !== b.byteLength / b.length) {
        throw new Error("Invalid array types");
      }
    }
    function bytesToArray(bytes, bitDepth) {
      if (bitDepth === 8) {
        return bytes;
      } else if (bitDepth === 16) {
        for (let i2 = 0; i2 < bytes.byteLength; i2 += 2) {
          const tmp = bytes[i2];
          bytes[i2] = bytes[i2 + 1];
          bytes[i2 + 1] = tmp;
        }
        if (bytes.byteOffset % 2) {
          const result = new Uint16Array(bytes.byteLength / 2);
          new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(bytes);
          return result;
        } else {
          return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
        }
      } else if (bitDepth === 32) {
        if (bytes.byteOffset % 4) {
          const result = new Float32Array(bytes.byteLength / 4);
          new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(bytes);
          return result;
        } else {
          return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
        }
      } else {
        throw new Error(`Invalid bitDepth (${bitDepth})`);
      }
    }
    function copyChannelToPixelData(pixelData, channel, offset, step) {
      verifyCompatible(pixelData.data, channel);
      const size = pixelData.width * pixelData.height;
      const data = pixelData.data;
      for (let i2 = 0, p = offset | 0; i2 < size; i2++, p = p + step | 0) {
        data[p] = channel[i2];
      }
    }
    function readDataRaw(buffer, pixelData, bitDepth, step, offset) {
      if (bitDepth == 32) {
        for (let i2 = 0; i2 < buffer.byteLength; i2 += 4) {
          const a = buffer[i2 + 0];
          const b = buffer[i2 + 1];
          const c = buffer[i2 + 2];
          const d = buffer[i2 + 3];
          buffer[i2 + 0] = d;
          buffer[i2 + 1] = c;
          buffer[i2 + 2] = b;
          buffer[i2 + 3] = a;
        }
      }
      const array = bytesToArray(buffer, bitDepth);
      if (pixelData && offset < step) {
        copyChannelToPixelData(pixelData, array, offset, step);
      }
    }
    function decodePredicted(data, width, height, mod) {
      for (let y = 0; y < height; y++) {
        const offset = y * width;
        for (let x2 = 1, o = offset + 1; x2 < width; x2++, o++) {
          data[o] = (data[o - 1] + data[o]) % mod;
        }
      }
    }
    function readDataZip(compressed, pixelData, width, height, bitDepth, step, offset, prediction) {
      const decompressed = (0, pako_1.inflate)(compressed);
      if (pixelData && offset < step) {
        const array = bytesToArray(decompressed, bitDepth);
        if (bitDepth === 8) {
          if (prediction)
            decodePredicted(decompressed, width, height, 256);
          copyChannelToPixelData(pixelData, decompressed, offset, step);
        } else if (bitDepth === 16) {
          if (prediction)
            decodePredicted(array, width, height, 65536);
          copyChannelToPixelData(pixelData, array, offset, step);
        } else if (bitDepth === 32) {
          if (prediction)
            decodePredicted(decompressed, width * 4, height, 256);
          let di = offset;
          const dst = new Uint32Array(pixelData.data.buffer, pixelData.data.byteOffset, pixelData.data.length);
          for (let y = 0; y < height; y++) {
            let a = width * 4 * y;
            for (let x2 = 0; x2 < width; x2++, a++, di += step) {
              const b = a + width;
              const c = b + width;
              const d = c + width;
              dst[di] = (decompressed[a] << 24 | decompressed[b] << 16 | decompressed[c] << 8 | decompressed[d]) >>> 0;
            }
          }
        } else {
          throw new Error("Invalid bitDepth");
        }
      }
    }
    function readDataRLE(reader, pixelData, width, height, _bitDepth, step, offsets, large) {
      const data = pixelData && pixelData.data;
      let lengths;
      if (large) {
        consumeMemory(reader, offsets.length * height * 4);
        lengths = new Uint32Array(offsets.length * height);
        for (let o = 0, li = 0; o < offsets.length; o++) {
          for (let y = 0; y < height; y++, li++) {
            lengths[li] = readUint32(reader);
          }
        }
      } else {
        consumeMemory(reader, offsets.length * height * 2);
        lengths = new Uint16Array(offsets.length * height);
        for (let o = 0, li = 0; o < offsets.length; o++) {
          for (let y = 0; y < height; y++, li++) {
            lengths[li] = readUint16(reader);
          }
        }
      }
      const extraLimit = step - 1 | 0;
      for (let c = 0, li = 0; c < offsets.length; c++) {
        const offset = offsets[c] | 0;
        const extra = c > extraLimit || offset > extraLimit;
        if (!data || extra) {
          for (let y = 0; y < height; y++, li++) {
            skipBytes(reader, lengths[li]);
          }
        } else {
          for (let y = 0, p = offset | 0; y < height; y++, li++) {
            const length = lengths[li];
            const buffer = readBytes(reader, length);
            for (let i2 = 0, x2 = 0; i2 < length; i2++) {
              let header = buffer[i2];
              if (header > 128) {
                const value = buffer[++i2];
                header = 256 - header | 0;
                for (let j = 0; j <= header && x2 < width; j = j + 1 | 0, x2 = x2 + 1 | 0) {
                  data[p] = value;
                  p = p + step | 0;
                }
              } else if (header < 128) {
                for (let j = 0; j <= header && x2 < width; j = j + 1 | 0, x2 = x2 + 1 | 0) {
                  data[p] = buffer[++i2];
                  p = p + step | 0;
                }
              } else {
              }
            }
          }
        }
      }
      recoverMemory(reader, lengths.byteLength);
    }
    function readSection(reader, round, func, skipEmpty = true, eightBytes = false) {
      let length = readUint32(reader);
      if (eightBytes) {
        if (length !== 0)
          throw new Error("Sizes larger than 4GB are not supported");
        length = readUint32(reader);
      }
      if (length <= 0 && skipEmpty)
        return void 0;
      let end = reader.offset + length;
      if (end > reader.view.byteLength)
        throw new Error("Section exceeds file size");
      const result = func(() => end - reader.offset);
      if (reader.offset !== end) {
        if (reader.offset > end) {
          warnOrThrow(reader, "Exceeded section limits");
        } else {
          warnOrThrow(reader, `Unread section data`);
        }
      }
      while (length % round) {
        length++;
        end++;
      }
      reader.offset = end;
      return result;
    }
    function readColor(reader) {
      const colorSpace = readUint16(reader);
      switch (colorSpace) {
        case 0: {
          const r = readUint16(reader) / 257;
          const g = readUint16(reader) / 257;
          const b = readUint16(reader) / 257;
          skipBytes(reader, 2);
          return { r, g, b };
        }
        case 1: {
          const h = readUint16(reader) / 65535;
          const s = readUint16(reader) / 65535;
          const b = readUint16(reader) / 65535;
          skipBytes(reader, 2);
          return { h, s, b };
        }
        case 2: {
          const c = readUint16(reader) / 257;
          const m = readUint16(reader) / 257;
          const y = readUint16(reader) / 257;
          const k = readUint16(reader) / 257;
          return { c, m, y, k };
        }
        case 7: {
          const l = readInt16(reader) / 1e4;
          const ta = readInt16(reader);
          const tb = readInt16(reader);
          const a = ta < 0 ? ta / 12800 : ta / 12700;
          const b = tb < 0 ? tb / 12800 : tb / 12700;
          skipBytes(reader, 2);
          return { l, a, b };
        }
        case 8: {
          const k = readUint16(reader) * 255 / 1e4;
          skipBytes(reader, 6);
          return { k };
        }
        default:
          throw new Error("Invalid color space");
      }
    }
    function readPattern(reader) {
      let length = readUint32(reader);
      while (length % 4)
        length++;
      const end = reader.offset + length;
      const version = readUint32(reader);
      if (version !== 1)
        throw new Error(`Invalid pattern version: ${version}`);
      const colorMode = readUint32(reader);
      const x2 = readInt16(reader);
      const y = readInt16(reader);
      if (colorMode !== 3 && colorMode !== 1 && colorMode !== 2) {
        throw new Error(`Unsupported pattern color mode: ${colorMode}`);
      }
      let name = readUnicodeString(reader);
      const id = readPascalString(reader, 1);
      const palette = [];
      if (colorMode === 2) {
        for (let i2 = 0; i2 < 256; i2++) {
          palette.push({
            r: readUint8(reader),
            g: readUint8(reader),
            b: readUint8(reader)
          });
        }
        skipBytes(reader, 4);
      }
      const version2 = readUint32(reader);
      if (version2 !== 3)
        throw new Error(`Invalid pattern VMAL version: ${version2}`);
      readUint32(reader);
      const top = readUint32(reader);
      const left = readUint32(reader);
      const bottom = readUint32(reader);
      const right = readUint32(reader);
      const channelsCount = readUint32(reader);
      const width = right - left;
      const height = bottom - top;
      const size = width * height * 4;
      consumeMemory(reader, size);
      const data = new Uint8Array(size);
      for (let i2 = 3; i2 < data.byteLength; i2 += 4) {
        data[i2] = 255;
      }
      for (let i2 = 0, ch = 0; i2 < channelsCount + 2; i2++) {
        const has = readUint32(reader);
        if (!has)
          continue;
        const length2 = readUint32(reader);
        const pixelDepth = readUint32(reader);
        const ctop = readUint32(reader);
        const cleft = readUint32(reader);
        const cbottom = readUint32(reader);
        const cright = readUint32(reader);
        const pixelDepth2 = readUint16(reader);
        const compressionMode = readUint8(reader);
        const dataLength = length2 - (4 + 16 + 2 + 1);
        const cdata = readBytes(reader, dataLength);
        if (pixelDepth !== 8 || pixelDepth2 !== 8) {
          throw new Error("16bit pixel depth not supported for patterns");
        }
        const w = cright - cleft;
        const h = cbottom - ctop;
        const ox = cleft - left;
        const oy = ctop - top;
        if (compressionMode === 0) {
          if (colorMode === 3 && ch < 3) {
            for (let y2 = 0; y2 < h; y2++) {
              for (let x3 = 0; x3 < w; x3++) {
                const src = x3 + y2 * w;
                const dst = (ox + x3 + (y2 + oy) * width) * 4;
                data[dst + ch] = cdata[src];
              }
            }
          } else if (colorMode === 1 && ch < 1) {
            for (let y2 = 0; y2 < h; y2++) {
              for (let x3 = 0; x3 < w; x3++) {
                const src = x3 + y2 * w;
                const dst = (ox + x3 + (y2 + oy) * width) * 4;
                const value = cdata[src];
                data[dst + 0] = value;
                data[dst + 1] = value;
                data[dst + 2] = value;
              }
            }
          } else if (colorMode === 2) {
            for (let y2 = 0; y2 < h; y2++) {
              for (let x3 = 0; x3 < w; x3++) {
                const src = x3 + y2 * w;
                const dst = (ox + x3 + (y2 + oy) * width) * 4;
                const index = cdata[src];
                const color = palette[index];
                data[dst + 0] = color.r;
                data[dst + 1] = color.g;
                data[dst + 2] = color.b;
              }
            }
          } else {
            if (reader.throwForMissingFeatures)
              throw new Error("Invalid color pattern");
          }
        } else if (compressionMode === 1) {
          consumeMemory(reader, w * h);
          const pixelData = { data, width, height };
          const tempData = { data: new Uint8Array(w * h), width: w, height: h };
          const cdataReader = createReader(cdata.buffer, cdata.byteOffset, cdata.byteLength);
          if (colorMode === 3 && ch < 3) {
            readDataRLE(cdataReader, tempData, w, h, 8, 1, [0], false);
            copyChannelToRGBA(tempData, pixelData, ox, oy, ch);
          }
          if (colorMode === 1 && ch < 1) {
            readDataRLE(cdataReader, tempData, w, h, 8, 1, [0], false);
            copyChannelToRGBA(tempData, pixelData, ox, oy, 0);
            setupGrayscale(pixelData);
          }
          if (colorMode === 2) {
            throw new Error("Indexed pattern color mode not implemented");
          }
          recoverMemory(reader, w * h);
        } else {
          throw new Error("Invalid pattern compression mode");
        }
        ch++;
      }
      reader.offset = end;
      return { id, name, x: x2, y, bounds: { x: left, y: top, w: width, h: height }, data };
    }
    function copyChannelToRGBA(srcData, dstData, ox, oy, offset) {
      const w = srcData.width;
      const h = srcData.height;
      const width = dstData.width;
      for (let y = 0; y < h; y++) {
        for (let x2 = 0; x2 < w; x2++) {
          const src = x2 + y * w;
          const dst = (ox + x2 + (y + oy) * width) * 4;
          const value = srcData.data[src];
          dstData.data[dst + offset] = value;
        }
      }
    }
    function consumeMemory(reader, size) {
      if (reader.totalMemoryLimit !== void 0) {
        if (reader.totalMemoryLimit < size)
          throw new Error("Exceeded memory limit");
        reader.totalMemoryLimit -= size;
      }
    }
    function recoverMemory(reader, size) {
      if (reader.totalMemoryLimit !== void 0) {
        reader.totalMemoryLimit += size;
      }
    }
  }
});

// node_modules/ag-psd/dist/effectsHelpers.js
var require_effectsHelpers = __commonJS({
  "node_modules/ag-psd/dist/effectsHelpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readEffects = readEffects;
    exports.writeEffects = writeEffects;
    var helpers_1 = require_helpers();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var bevelStyles = [
      void 0,
      "outer bevel",
      "inner bevel",
      "emboss",
      "pillow emboss",
      "stroke emboss"
    ];
    function readBlendMode(reader) {
      (0, psdReader_1.checkSignature)(reader, "8BIM");
      return helpers_1.toBlendMode[(0, psdReader_1.readSignature)(reader)] || "normal";
    }
    function writeBlendMode(writer, mode) {
      (0, psdWriter_1.writeSignature)(writer, "8BIM");
      (0, psdWriter_1.writeSignature)(writer, helpers_1.fromBlendMode[mode] || "norm");
    }
    function readFixedPoint8(reader) {
      return (0, psdReader_1.readUint8)(reader) / 255;
    }
    function writeFixedPoint8(writer, value) {
      (0, psdWriter_1.writeUint8)(writer, Math.round(value * 255) | 0);
    }
    function readEffects(reader) {
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 0)
        throw new Error(`Invalid effects layer version: ${version}`);
      const effectsCount = (0, psdReader_1.readUint16)(reader);
      const effects = {};
      for (let i2 = 0; i2 < effectsCount; i2++) {
        (0, psdReader_1.checkSignature)(reader, "8BIM");
        const type = (0, psdReader_1.readSignature)(reader);
        switch (type) {
          case "cmnS": {
            const size = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            const visible = !!(0, psdReader_1.readUint8)(reader);
            (0, psdReader_1.skipBytes)(reader, 2);
            if (size !== 7 || version2 !== 0 || !visible)
              throw new Error(`Invalid effects common state`);
            break;
          }
          case "dsdw":
          // drop shadow (see See Effects layer, drop shadow and inner shadow info)
          case "isdw": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 41 && blockSize !== 51)
              throw new Error(`Invalid shadow size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid shadow version: ${version2}`);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            (0, psdReader_1.readFixedPoint32)(reader);
            const angle = (0, psdReader_1.readFixedPoint32)(reader);
            const distance = (0, psdReader_1.readFixedPoint32)(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const blendMode = readBlendMode(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const useGlobalLight = !!(0, psdReader_1.readUint8)(reader);
            const opacity = readFixedPoint8(reader);
            if (blockSize >= 51)
              (0, psdReader_1.readColor)(reader);
            const shadowInfo = {
              size: { units: "Pixels", value: size },
              distance: { units: "Pixels", value: distance },
              angle,
              color,
              blendMode,
              enabled,
              useGlobalLight,
              opacity
            };
            if (type === "dsdw") {
              effects.dropShadow = [shadowInfo];
            } else {
              effects.innerShadow = [shadowInfo];
            }
            break;
          }
          case "oglw": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 32 && blockSize !== 42)
              throw new Error(`Invalid outer glow size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid outer glow version: ${version2}`);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            (0, psdReader_1.readFixedPoint32)(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const blendMode = readBlendMode(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const opacity = readFixedPoint8(reader);
            if (blockSize >= 42)
              (0, psdReader_1.readColor)(reader);
            effects.outerGlow = {
              size: { units: "Pixels", value: size },
              color,
              blendMode,
              enabled,
              opacity
            };
            break;
          }
          case "iglw": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 32 && blockSize !== 43)
              throw new Error(`Invalid inner glow size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid inner glow version: ${version2}`);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            (0, psdReader_1.readFixedPoint32)(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const blendMode = readBlendMode(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const opacity = readFixedPoint8(reader);
            if (blockSize >= 43) {
              (0, psdReader_1.readUint8)(reader);
              (0, psdReader_1.readColor)(reader);
            }
            effects.innerGlow = {
              size: { units: "Pixels", value: size },
              color,
              blendMode,
              enabled,
              opacity
            };
            break;
          }
          case "bevl": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 58 && blockSize !== 78)
              throw new Error(`Invalid bevel size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid bevel version: ${version2}`);
            const angle = (0, psdReader_1.readFixedPoint32)(reader);
            const strength = (0, psdReader_1.readFixedPoint32)(reader);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            const highlightBlendMode = readBlendMode(reader);
            const shadowBlendMode = readBlendMode(reader);
            const highlightColor = (0, psdReader_1.readColor)(reader);
            const shadowColor = (0, psdReader_1.readColor)(reader);
            const style = bevelStyles[(0, psdReader_1.readUint8)(reader)] || "inner bevel";
            const highlightOpacity = readFixedPoint8(reader);
            const shadowOpacity = readFixedPoint8(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const useGlobalLight = !!(0, psdReader_1.readUint8)(reader);
            const direction = (0, psdReader_1.readUint8)(reader) ? "down" : "up";
            if (blockSize >= 78) {
              (0, psdReader_1.readColor)(reader);
              (0, psdReader_1.readColor)(reader);
            }
            effects.bevel = {
              size: { units: "Pixels", value: size },
              angle,
              strength,
              highlightBlendMode,
              shadowBlendMode,
              highlightColor,
              shadowColor,
              style,
              highlightOpacity,
              shadowOpacity,
              enabled,
              useGlobalLight,
              direction
            };
            break;
          }
          case "sofi": {
            const size = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (size !== 34)
              throw new Error(`Invalid effects solid fill info size: ${size}`);
            if (version2 !== 2)
              throw new Error(`Invalid effects solid fill info version: ${version2}`);
            const blendMode = readBlendMode(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const opacity = readFixedPoint8(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            (0, psdReader_1.readColor)(reader);
            effects.solidFill = [{ blendMode, color, opacity, enabled }];
            break;
          }
          default:
            throw new Error(`Invalid effect type: '${type}'`);
        }
      }
      return effects;
    }
    function writeShadowInfo(writer, shadow) {
      var _a2;
      (0, psdWriter_1.writeUint32)(writer, 51);
      (0, psdWriter_1.writeUint32)(writer, 2);
      (0, psdWriter_1.writeFixedPoint32)(writer, shadow.size && shadow.size.value || 0);
      (0, psdWriter_1.writeFixedPoint32)(writer, 0);
      (0, psdWriter_1.writeFixedPoint32)(writer, shadow.angle || 0);
      (0, psdWriter_1.writeFixedPoint32)(writer, shadow.distance && shadow.distance.value || 0);
      (0, psdWriter_1.writeColor)(writer, shadow.color);
      writeBlendMode(writer, shadow.blendMode);
      (0, psdWriter_1.writeUint8)(writer, shadow.enabled ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, shadow.useGlobalLight ? 1 : 0);
      writeFixedPoint8(writer, (_a2 = shadow.opacity) !== null && _a2 !== void 0 ? _a2 : 1);
      (0, psdWriter_1.writeColor)(writer, shadow.color);
    }
    function writeEffects(writer, effects) {
      var _a2, _b2, _c, _d, _e, _f;
      const dropShadow = (_a2 = effects.dropShadow) === null || _a2 === void 0 ? void 0 : _a2[0];
      const innerShadow = (_b2 = effects.innerShadow) === null || _b2 === void 0 ? void 0 : _b2[0];
      const outerGlow = effects.outerGlow;
      const innerGlow = effects.innerGlow;
      const bevel = effects.bevel;
      const solidFill = (_c = effects.solidFill) === null || _c === void 0 ? void 0 : _c[0];
      let count = 1;
      if (dropShadow)
        count++;
      if (innerShadow)
        count++;
      if (outerGlow)
        count++;
      if (innerGlow)
        count++;
      if (bevel)
        count++;
      if (solidFill)
        count++;
      (0, psdWriter_1.writeUint16)(writer, 0);
      (0, psdWriter_1.writeUint16)(writer, count);
      (0, psdWriter_1.writeSignature)(writer, "8BIM");
      (0, psdWriter_1.writeSignature)(writer, "cmnS");
      (0, psdWriter_1.writeUint32)(writer, 7);
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, psdWriter_1.writeUint8)(writer, 1);
      (0, psdWriter_1.writeZeros)(writer, 2);
      if (dropShadow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "dsdw");
        writeShadowInfo(writer, dropShadow);
      }
      if (innerShadow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "isdw");
        writeShadowInfo(writer, innerShadow);
      }
      if (outerGlow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "oglw");
        (0, psdWriter_1.writeUint32)(writer, 42);
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeFixedPoint32)(writer, ((_d = outerGlow.size) === null || _d === void 0 ? void 0 : _d.value) || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, 0);
        (0, psdWriter_1.writeColor)(writer, outerGlow.color);
        writeBlendMode(writer, outerGlow.blendMode);
        (0, psdWriter_1.writeUint8)(writer, outerGlow.enabled ? 1 : 0);
        writeFixedPoint8(writer, outerGlow.opacity || 0);
        (0, psdWriter_1.writeColor)(writer, outerGlow.color);
      }
      if (innerGlow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "iglw");
        (0, psdWriter_1.writeUint32)(writer, 43);
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeFixedPoint32)(writer, ((_e = innerGlow.size) === null || _e === void 0 ? void 0 : _e.value) || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, 0);
        (0, psdWriter_1.writeColor)(writer, innerGlow.color);
        writeBlendMode(writer, innerGlow.blendMode);
        (0, psdWriter_1.writeUint8)(writer, innerGlow.enabled ? 1 : 0);
        writeFixedPoint8(writer, innerGlow.opacity || 0);
        (0, psdWriter_1.writeUint8)(writer, 0);
        (0, psdWriter_1.writeColor)(writer, innerGlow.color);
      }
      if (bevel) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "bevl");
        (0, psdWriter_1.writeUint32)(writer, 78);
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeFixedPoint32)(writer, bevel.angle || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, bevel.strength || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, ((_f = bevel.size) === null || _f === void 0 ? void 0 : _f.value) || 0);
        writeBlendMode(writer, bevel.highlightBlendMode);
        writeBlendMode(writer, bevel.shadowBlendMode);
        (0, psdWriter_1.writeColor)(writer, bevel.highlightColor);
        (0, psdWriter_1.writeColor)(writer, bevel.shadowColor);
        const style = bevelStyles.indexOf(bevel.style);
        (0, psdWriter_1.writeUint8)(writer, style <= 0 ? 1 : style);
        writeFixedPoint8(writer, bevel.highlightOpacity || 0);
        writeFixedPoint8(writer, bevel.shadowOpacity || 0);
        (0, psdWriter_1.writeUint8)(writer, bevel.enabled ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, bevel.useGlobalLight ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, bevel.direction === "down" ? 1 : 0);
        (0, psdWriter_1.writeColor)(writer, bevel.highlightColor);
        (0, psdWriter_1.writeColor)(writer, bevel.shadowColor);
      }
      if (solidFill) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "sofi");
        (0, psdWriter_1.writeUint32)(writer, 34);
        (0, psdWriter_1.writeUint32)(writer, 2);
        writeBlendMode(writer, solidFill.blendMode);
        (0, psdWriter_1.writeColor)(writer, solidFill.color);
        writeFixedPoint8(writer, solidFill.opacity || 0);
        (0, psdWriter_1.writeUint8)(writer, solidFill.enabled ? 1 : 0);
        (0, psdWriter_1.writeColor)(writer, solidFill.color);
      }
    }
  }
});

// node_modules/ag-psd/dist/engineData.js
var require_engineData = __commonJS({
  "node_modules/ag-psd/dist/engineData.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseEngineData = parseEngineData;
    exports.serializeEngineData = serializeEngineData;
    function isWhitespace(char) {
      return char === 32 || char === 10 || char === 13 || char === 9;
    }
    function isNumber(char) {
      return char >= 48 && char <= 57 || char === 46 || char === 45;
    }
    function parseEngineData(data) {
      let index = 0;
      function skipWhitespace() {
        while (index < data.length && isWhitespace(data[index])) {
          index++;
        }
      }
      function getTextByte() {
        let byte = data[index];
        index++;
        if (byte === 92) {
          byte = data[index];
          index++;
        }
        return byte;
      }
      function getText() {
        let result = "";
        if (data[index] === 41) {
          index++;
          return result;
        }
        if (data[index] !== 254 || data[index + 1] !== 255) {
          while (index < data.length && data[index] !== 41) {
            result += String.fromCharCode(getTextByte());
          }
          index++;
          return result;
        }
        index += 2;
        while (index < data.length && data[index] !== 41) {
          const high = getTextByte();
          const low = getTextByte();
          const char = high << 8 | low;
          result += String.fromCharCode(char);
        }
        index++;
        return result;
      }
      let root = null;
      const stack = [];
      function pushContainer(value) {
        if (!stack.length) {
          stack.push(value);
          root = value;
        } else {
          pushValue(value);
          stack.push(value);
        }
      }
      function pushValue(value) {
        if (!stack.length)
          throw new Error("Invalid data");
        const top = stack[stack.length - 1];
        if (typeof top === "string") {
          stack[stack.length - 2][top] = value;
          pop();
        } else if (Array.isArray(top)) {
          top.push(value);
        } else {
          throw new Error("Invalid data");
        }
      }
      function pushProperty(name) {
        if (!stack.length)
          pushContainer({});
        const top = stack[stack.length - 1];
        if (top && typeof top === "string") {
          if (name === "nil") {
            pushValue(null);
          } else {
            pushValue(`/${name}`);
          }
        } else if (top && typeof top === "object") {
          stack.push(name);
        } else {
          throw new Error("Invalid data");
        }
      }
      function pop() {
        if (!stack.length)
          throw new Error("Invalid data");
        stack.pop();
      }
      skipWhitespace();
      let dataLength = data.length;
      while (dataLength > 0 && data[dataLength - 1] === 0)
        dataLength--;
      while (index < dataLength) {
        const i2 = index;
        const char = data[i2];
        if (char === 60 && data[i2 + 1] === 60) {
          index += 2;
          pushContainer({});
        } else if (char === 62 && data[i2 + 1] === 62) {
          index += 2;
          pop();
        } else if (char === 47) {
          index += 1;
          const start = index;
          while (index < data.length && !isWhitespace(data[index])) {
            index++;
          }
          let name = "";
          for (let i3 = start; i3 < index; i3++) {
            name += String.fromCharCode(data[i3]);
          }
          pushProperty(name);
        } else if (char === 40) {
          index += 1;
          pushValue(getText());
        } else if (char === 91) {
          index += 1;
          pushContainer([]);
        } else if (char === 93) {
          index += 1;
          pop();
        } else if (char === 110 && data[i2 + 1] === 117 && data[i2 + 2] === 108 && data[i2 + 3] === 108) {
          index += 4;
          pushValue(null);
        } else if (char === 116 && data[i2 + 1] === 114 && data[i2 + 2] === 117 && data[i2 + 3] === 101) {
          index += 4;
          pushValue(true);
        } else if (char === 102 && data[i2 + 1] === 97 && data[i2 + 2] === 108 && data[i2 + 3] === 115 && data[i2 + 4] === 101) {
          index += 5;
          pushValue(false);
        } else if (isNumber(char)) {
          let value = "";
          while (index < data.length && isNumber(data[index])) {
            value += String.fromCharCode(data[index]);
            index++;
          }
          pushValue(parseFloat(value));
        } else {
          index += 1;
          console.log(
            `Invalid token '${String.fromCharCode(char)}' (${char}) at ${index}`
            // + ` near '${String.fromCharCode.apply(null, data.slice(index - 10, index + 20) as any)}'`
            // + ` data [${Array.from(data.slice(index - 10, index + 20)).join(', ')}]`
          );
        }
        skipWhitespace();
      }
      return root;
    }
    var floatKeys = [
      "Axis",
      "XY",
      "Zone",
      "WordSpacing",
      "FirstLineIndent",
      "GlyphSpacing",
      "StartIndent",
      "EndIndent",
      "SpaceBefore",
      "SpaceAfter",
      "LetterSpacing",
      "Values",
      "GridSize",
      "GridLeading",
      "PointBase",
      "BoxBounds",
      "TransformPoint0",
      "TransformPoint1",
      "TransformPoint2",
      "FontSize",
      "Leading",
      "HorizontalScale",
      "VerticalScale",
      "BaselineShift",
      "Tsume",
      "OutlineWidth",
      "AutoLeading"
    ];
    var intArrays = ["RunLengthArray"];
    function serializeEngineData(data, condensed = false) {
      let buffer = new Uint8Array(1024);
      let offset = 0;
      let indent = 0;
      function write(value) {
        if (offset >= buffer.length) {
          const newBuffer = new Uint8Array(buffer.length * 2);
          newBuffer.set(buffer);
          buffer = newBuffer;
        }
        buffer[offset] = value;
        offset++;
      }
      function writeString(value) {
        for (let i2 = 0; i2 < value.length; i2++) {
          write(value.charCodeAt(i2));
        }
      }
      function writeIndent() {
        if (condensed) {
          writeString(" ");
        } else {
          for (let i2 = 0; i2 < indent; i2++) {
            writeString("	");
          }
        }
      }
      function writeProperty(key, value) {
        writeIndent();
        writeString(`/${key}`);
        writeValue(value, key, true);
        if (!condensed)
          writeString("\n");
      }
      function serializeInt(value) {
        return value.toString();
      }
      function serializeFloat(value) {
        return value.toFixed(5).replace(/(\d)0+$/g, "$1").replace(/^0+\.([1-9])/g, ".$1").replace(/^-0+\.0(\d)/g, "-.0$1");
      }
      function serializeNumber(value, key) {
        const isFloat = key && floatKeys.indexOf(key) !== -1 || (value | 0) !== value;
        return isFloat ? serializeFloat(value) : serializeInt(value);
      }
      function getKeys(value) {
        const keys = Object.keys(value);
        if (keys.indexOf("98") !== -1)
          keys.unshift(...keys.splice(keys.indexOf("98"), 1));
        if (keys.indexOf("99") !== -1)
          keys.unshift(...keys.splice(keys.indexOf("99"), 1));
        return keys;
      }
      function writeStringByte(value) {
        if (value === 40 || value === 41 || value === 92) {
          write(92);
        }
        write(value);
      }
      function writeValue(value, key, inProperty = false) {
        function writePrefix() {
          if (inProperty) {
            writeString(" ");
          } else {
            writeIndent();
          }
        }
        if (value === null) {
          writePrefix();
          writeString(condensed ? "/nil" : "null");
        } else if (typeof value === "number") {
          writePrefix();
          writeString(serializeNumber(value, key));
        } else if (typeof value === "boolean") {
          writePrefix();
          writeString(value ? "true" : "false");
        } else if (typeof value === "string") {
          writePrefix();
          if ((key === "99" || key === "98") && value.charAt(0) === "/") {
            writeString(value);
          } else {
            writeString("(");
            write(254);
            write(255);
            for (let i2 = 0; i2 < value.length; i2++) {
              const code = value.charCodeAt(i2);
              writeStringByte(code >> 8 & 255);
              writeStringByte(code & 255);
            }
            writeString(")");
          }
        } else if (Array.isArray(value)) {
          writePrefix();
          if (value.every((x2) => typeof x2 === "number")) {
            writeString("[");
            const intArray = intArrays.indexOf(key) !== -1;
            for (const x2 of value) {
              writeString(" ");
              writeString(intArray ? serializeNumber(x2) : serializeFloat(x2));
            }
            writeString(" ]");
          } else {
            writeString("[");
            if (!condensed)
              writeString("\n");
            for (const x2 of value) {
              writeValue(x2, key);
              if (!condensed)
                writeString("\n");
            }
            writeIndent();
            writeString("]");
          }
        } else if (typeof value === "object") {
          if (inProperty && !condensed)
            writeString("\n");
          writeIndent();
          writeString("<<");
          if (!condensed)
            writeString("\n");
          indent++;
          for (const key2 of getKeys(value)) {
            writeProperty(key2, value[key2]);
          }
          indent--;
          writeIndent();
          writeString(">>");
        }
        return void 0;
      }
      if (condensed) {
        if (typeof data === "object") {
          for (const key of getKeys(data)) {
            writeProperty(key, data[key]);
          }
        }
      } else {
        writeString("\n\n");
        writeValue(data);
      }
      return buffer.slice(0, offset);
    }
  }
});

// node_modules/ag-psd/dist/text.js
var require_text = __commonJS({
  "node_modules/ag-psd/dist/text.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeEngineData = decodeEngineData;
    exports.encodeEngineData = encodeEngineData;
    var defaultFont = {
      name: "MyriadPro-Regular",
      script: 0,
      type: 0,
      synthetic: 0
    };
    var defaultParagraphStyle = {
      justification: "left",
      firstLineIndent: 0,
      startIndent: 0,
      endIndent: 0,
      spaceBefore: 0,
      spaceAfter: 0,
      autoHyphenate: true,
      hyphenatedWordSize: 6,
      preHyphen: 2,
      postHyphen: 2,
      consecutiveHyphens: 8,
      zone: 36,
      wordSpacing: [0.8, 1, 1.33],
      letterSpacing: [0, 0, 0],
      glyphSpacing: [1, 1, 1],
      autoLeading: 1.2,
      leadingType: 0,
      hanging: false,
      burasagari: false,
      kinsokuOrder: 0,
      everyLineComposer: false
    };
    var defaultStyle = {
      font: defaultFont,
      fontSize: 12,
      fauxBold: false,
      fauxItalic: false,
      autoLeading: true,
      leading: 0,
      horizontalScale: 1,
      verticalScale: 1,
      tracking: 0,
      autoKerning: true,
      kerning: 0,
      baselineShift: 0,
      fontCaps: 0,
      fontBaseline: 0,
      underline: false,
      strikethrough: false,
      ligatures: true,
      dLigatures: false,
      baselineDirection: 2,
      tsume: 0,
      styleRunAlignment: 2,
      language: 0,
      noBreak: false,
      fillColor: { r: 0, g: 0, b: 0 },
      strokeColor: { r: 0, g: 0, b: 0 },
      fillFlag: true,
      strokeFlag: false,
      fillFirst: true,
      yUnderline: 1,
      outlineWidth: 1,
      characterDirection: 0,
      hindiNumbers: false,
      kashida: 1,
      diacriticPos: 2
    };
    var defaultGridInfo = {
      isOn: false,
      show: false,
      size: 18,
      leading: 22,
      color: { r: 0, g: 0, b: 255 },
      leadingFillColor: { r: 0, g: 0, b: 255 },
      alignLineHeightToGridFlags: false
    };
    var paragraphStyleKeys = [
      "justification",
      "firstLineIndent",
      "startIndent",
      "endIndent",
      "spaceBefore",
      "spaceAfter",
      "autoHyphenate",
      "hyphenatedWordSize",
      "preHyphen",
      "postHyphen",
      "consecutiveHyphens",
      "zone",
      "wordSpacing",
      "letterSpacing",
      "glyphSpacing",
      "autoLeading",
      "leadingType",
      "hanging",
      "burasagari",
      "kinsokuOrder",
      "everyLineComposer"
    ];
    var styleKeys = [
      "font",
      "fontSize",
      "fauxBold",
      "fauxItalic",
      "autoLeading",
      "leading",
      "horizontalScale",
      "verticalScale",
      "tracking",
      "autoKerning",
      "kerning",
      "baselineShift",
      "fontCaps",
      "fontBaseline",
      "underline",
      "strikethrough",
      "ligatures",
      "dLigatures",
      "baselineDirection",
      "tsume",
      "styleRunAlignment",
      "language",
      "noBreak",
      "fillColor",
      "strokeColor",
      "fillFlag",
      "strokeFlag",
      "fillFirst",
      "yUnderline",
      "outlineWidth",
      "characterDirection",
      "hindiNumbers",
      "kashida",
      "diacriticPos"
    ];
    var antialias = ["none", "crisp", "strong", "smooth", "sharp"];
    var justification = [
      "left",
      // 0
      "right",
      // 1
      "center",
      // 2
      "justify-left",
      // 3
      "justify-right",
      // 4
      "justify-center",
      // 5
      "justify-all"
      // 6
    ];
    function upperFirst(value) {
      return value.substring(0, 1).toUpperCase() + value.substring(1);
    }
    function decodeColor(color) {
      const c = color.Values;
      switch (color.Type) {
        case 0:
          return { k: c[1] * 255 };
        // grayscale (alpha?)
        case 1:
          return c[0] === 1 ? { r: c[1] * 255, g: c[2] * 255, b: c[3] * 255 } : (
            // rgb
            { r: c[1] * 255, g: c[2] * 255, b: c[3] * 255, a: c[0] * 255 }
          );
        // rgba
        case 2:
          return { c: c[1] * 255, m: c[2] * 255, y: c[3] * 255, k: c[4] * 255 };
        // cmyk (alpha?)
        default:
          throw new Error("Unknown color type in text layer");
      }
    }
    function encodeColor(color) {
      if (!color) {
        return { Type: 1, Values: [0, 0, 0, 0] };
      } else if ("r" in color) {
        return { Type: 1, Values: ["a" in color ? color.a / 255 : 1, color.r / 255, color.g / 255, color.b / 255] };
      } else if ("c" in color) {
        return { Type: 2, Values: [1, color.c / 255, color.m / 255, color.y / 255, color.k / 255] };
      } else if ("k" in color) {
        return { Type: 0, Values: [1, color.k / 255] };
      } else {
        throw new Error("Invalid color type in text layer");
      }
    }
    function arraysEqual(a, b) {
      if (!a || !b)
        return false;
      if (a.length !== b.length)
        return false;
      for (let i2 = 0; i2 < a.length; i2++)
        if (a[i2] !== b[i2])
          return false;
      return true;
    }
    function objectsEqual(a, b) {
      if (!a || !b)
        return false;
      for (const key of Object.keys(a))
        if (a[key] !== b[key])
          return false;
      for (const key of Object.keys(b))
        if (a[key] !== b[key])
          return false;
      return true;
    }
    function findOrAddFont(fonts, font) {
      for (let i2 = 0; i2 < fonts.length; i2++) {
        if (fonts[i2].name === font.name)
          return i2;
      }
      fonts.push(font);
      return fonts.length - 1;
    }
    function decodeObject(obj, keys, fonts) {
      const result = {};
      for (const key of keys) {
        const Key = upperFirst(key);
        if (obj[Key] === void 0)
          continue;
        if (key === "justification") {
          result[key] = justification[obj[Key]];
        } else if (key === "font") {
          result[key] = fonts[obj[Key]];
        } else if (key === "fillColor" || key === "strokeColor") {
          result[key] = decodeColor(obj[Key]);
        } else {
          result[key] = obj[Key];
        }
      }
      return result;
    }
    function encodeObject(obj, keys, fonts) {
      var _a2;
      const result = {};
      for (const key of keys) {
        const Key = upperFirst(key);
        if (obj[key] === void 0)
          continue;
        if (key === "justification") {
          result[Key] = justification.indexOf((_a2 = obj[key]) !== null && _a2 !== void 0 ? _a2 : "left");
        } else if (key === "font") {
          result[Key] = findOrAddFont(fonts, obj[key]);
        } else if (key === "fillColor" || key === "strokeColor") {
          result[Key] = encodeColor(obj[key]);
        } else {
          result[Key] = obj[key];
        }
      }
      return result;
    }
    function decodeParagraphStyle(obj, fonts) {
      return decodeObject(obj, paragraphStyleKeys, fonts);
    }
    function decodeStyle(obj, fonts) {
      return decodeObject(obj, styleKeys, fonts);
    }
    function encodeParagraphStyle(obj, fonts) {
      return encodeObject(obj, paragraphStyleKeys, fonts);
    }
    function encodeStyle(obj, fonts) {
      return encodeObject(obj, styleKeys, fonts);
    }
    function deduplicateValues(base, runs, keys) {
      if (!runs.length)
        return;
      for (const key of keys) {
        const value = runs[0].style[key];
        if (value !== void 0) {
          let identical = false;
          if (Array.isArray(value)) {
            identical = runs.every((r) => arraysEqual(r.style[key], value));
          } else if (typeof value === "object") {
            identical = runs.every((r) => objectsEqual(r.style[key], value));
          } else {
            identical = runs.every((r) => r.style[key] === value);
          }
          if (identical) {
            base[key] = value;
          }
        }
        const styleValue = base[key];
        if (styleValue !== void 0) {
          for (const r of runs) {
            let same = false;
            if (Array.isArray(value)) {
              same = arraysEqual(r.style[key], value);
            } else if (typeof value === "object") {
              same = objectsEqual(r.style[key], value);
            } else {
              same = r.style[key] === value;
            }
            if (same)
              delete r.style[key];
          }
        }
      }
      if (runs.every((x2) => Object.keys(x2.style).length === 0)) {
        runs.length = 0;
      }
    }
    function decodeEngineData(engineData) {
      var _a2, _b2, _c, _d, _e, _f;
      const engineDict = engineData.EngineDict;
      const resourceDict = engineData.ResourceDict;
      const fonts = resourceDict.FontSet.map((f) => ({
        name: f.Name,
        script: f.Script,
        type: f.FontType,
        synthetic: f.Synthetic
      }));
      let text = engineDict.Editor.Text.replace(/\r/g, "\n");
      let removedCharacters = 0;
      while (/\n$/.test(text)) {
        text = text.substring(0, text.length - 1);
        removedCharacters++;
      }
      const result = {
        text,
        antiAlias: (_a2 = antialias[engineDict.AntiAlias]) !== null && _a2 !== void 0 ? _a2 : "smooth",
        useFractionalGlyphWidths: !!engineDict.UseFractionalGlyphWidths,
        superscriptSize: resourceDict.SuperscriptSize,
        superscriptPosition: resourceDict.SuperscriptPosition,
        subscriptSize: resourceDict.SubscriptSize,
        subscriptPosition: resourceDict.SubscriptPosition,
        smallCapSize: resourceDict.SmallCapSize
      };
      const photoshop = (_f = (_e = (_d = (_c = (_b2 = engineDict.Rendered) === null || _b2 === void 0 ? void 0 : _b2.Shapes) === null || _c === void 0 ? void 0 : _c.Children) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.Cookie) === null || _f === void 0 ? void 0 : _f.Photoshop;
      if (photoshop) {
        result.shapeType = photoshop.ShapeType === 1 ? "box" : "point";
        if (photoshop.PointBase)
          result.pointBase = photoshop.PointBase;
        if (photoshop.BoxBounds)
          result.boxBounds = photoshop.BoxBounds;
      }
      const paragraphRun = engineDict.ParagraphRun;
      result.paragraphStyle = {};
      result.paragraphStyleRuns = [];
      for (let i2 = 0; i2 < paragraphRun.RunArray.length; i2++) {
        const run = paragraphRun.RunArray[i2];
        const length = paragraphRun.RunLengthArray[i2];
        const style = decodeParagraphStyle(run.ParagraphSheet.Properties, fonts);
        result.paragraphStyleRuns.push({
          length,
          style
          /*, adjustments*/
        });
      }
      for (let counter = removedCharacters; result.paragraphStyleRuns.length && counter > 0; counter--) {
        if (--result.paragraphStyleRuns[result.paragraphStyleRuns.length - 1].length === 0) {
          result.paragraphStyleRuns.pop();
        }
      }
      deduplicateValues(result.paragraphStyle, result.paragraphStyleRuns, paragraphStyleKeys);
      if (!result.paragraphStyleRuns.length)
        delete result.paragraphStyleRuns;
      const styleRun = engineDict.StyleRun;
      result.style = {};
      result.styleRuns = [];
      for (let i2 = 0; i2 < styleRun.RunArray.length; i2++) {
        const length = styleRun.RunLengthArray[i2];
        const style = decodeStyle(styleRun.RunArray[i2].StyleSheet.StyleSheetData, fonts);
        if (!style.font)
          style.font = fonts[0];
        result.styleRuns.push({ length, style });
      }
      for (let counter = removedCharacters; result.styleRuns.length && counter > 0; counter--) {
        if (--result.styleRuns[result.styleRuns.length - 1].length === 0) {
          result.styleRuns.pop();
        }
      }
      deduplicateValues(result.style, result.styleRuns, styleKeys);
      if (!result.styleRuns.length)
        delete result.styleRuns;
      return result;
    }
    function encodeEngineData(data) {
      var _a2, _b2, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
      const text = `${(data.text || "").replace(/\r?\n/g, "\r")}\r`;
      const fonts = [
        { name: "AdobeInvisFont", script: 0, type: 0, synthetic: 0 }
      ];
      const defFont = ((_a2 = data.style) === null || _a2 === void 0 ? void 0 : _a2.font) || ((_c = (_b2 = data.styleRuns) === null || _b2 === void 0 ? void 0 : _b2.find((s) => s.style.font)) === null || _c === void 0 ? void 0 : _c.style.font) || defaultFont;
      const paragraphRunArray = [];
      const paragraphRunLengthArray = [];
      const paragraphRuns = data.paragraphStyleRuns;
      if (paragraphRuns && paragraphRuns.length) {
        let leftLength2 = text.length;
        for (const run of paragraphRuns) {
          let runLength = Math.min(run.length, leftLength2);
          leftLength2 -= runLength;
          if (!runLength)
            continue;
          if (leftLength2 === 1 && run === paragraphRuns[paragraphRuns.length - 1]) {
            runLength++;
            leftLength2--;
          }
          paragraphRunLengthArray.push(runLength);
          paragraphRunArray.push({
            ParagraphSheet: {
              DefaultStyleSheet: 0,
              Properties: encodeParagraphStyle(Object.assign(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), run.style), fonts)
            },
            Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
          });
        }
        if (leftLength2) {
          paragraphRunLengthArray.push(leftLength2);
          paragraphRunArray.push({
            ParagraphSheet: {
              DefaultStyleSheet: 0,
              Properties: encodeParagraphStyle(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), fonts)
            },
            Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
          });
        }
      } else {
        for (let i2 = 0, last = 0; i2 < text.length; i2++) {
          if (text.charCodeAt(i2) === 13) {
            paragraphRunLengthArray.push(i2 - last + 1);
            paragraphRunArray.push({
              ParagraphSheet: {
                DefaultStyleSheet: 0,
                Properties: encodeParagraphStyle(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), fonts)
              },
              Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
            });
            last = i2 + 1;
          }
        }
      }
      const styleSheetData = encodeStyle(Object.assign(Object.assign({}, defaultStyle), { font: defFont }), fonts);
      const styleRuns = data.styleRuns || [{ length: text.length, style: data.style || {} }];
      const styleRunArray = [];
      const styleRunLengthArray = [];
      let leftLength = text.length;
      for (const run of styleRuns) {
        let runLength = Math.min(run.length, leftLength);
        leftLength -= runLength;
        if (!runLength)
          continue;
        if (leftLength === 1 && run === styleRuns[styleRuns.length - 1]) {
          runLength++;
          leftLength--;
        }
        styleRunLengthArray.push(runLength);
        styleRunArray.push({
          StyleSheet: {
            StyleSheetData: encodeStyle(Object.assign(Object.assign({ kerning: 0, autoKerning: true, fillColor: { r: 0, g: 0, b: 0 } }, data.style), run.style), fonts)
          }
        });
      }
      if (leftLength && styleRuns.length) {
        styleRunLengthArray.push(leftLength);
        styleRunArray.push({
          StyleSheet: {
            StyleSheetData: encodeStyle(Object.assign({ kerning: 0, autoKerning: true, fillColor: { r: 0, g: 0, b: 0 } }, data.style), fonts)
          }
        });
      }
      const gridInfo = Object.assign(Object.assign({}, defaultGridInfo), data.gridInfo);
      const WritingDirection = data.orientation === "vertical" ? 2 : 0;
      const Procession = data.orientation === "vertical" ? 1 : 0;
      const ShapeType = data.shapeType === "box" ? 1 : 0;
      const Photoshop = {
        ShapeType
      };
      if (ShapeType === 0) {
        Photoshop.PointBase = data.pointBase || [0, 0];
      } else {
        Photoshop.BoxBounds = data.boxBounds || [0, 0, 0, 0];
      }
      Photoshop.Base = {
        ShapeType,
        TransformPoint0: [1, 0],
        TransformPoint1: [0, 1],
        TransformPoint2: [0, 0]
      };
      const defaultResources = {
        KinsokuSet: [
          {
            Name: "PhotoshopKinsokuHard",
            NoStart: "\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF1F\uFF01\u30FC\u2015\u2019\u201D\uFF09\u3015\uFF3D\uFF5D\u3009\u300B\u300D\u300F\u3011\u30FD\u30FE\u309D\u309E\u3005\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6\u309B\u309C?!)]},.:;\u2103\u2109\xA2\uFF05\u2030",
            NoEnd: "\u2018\u201C\uFF08\u3014\uFF3B\uFF5B\u3008\u300A\u300C\u300E\u3010([{\uFFE5\uFF04\xA3\uFF20\xA7\u3012\uFF03",
            Keep: "\u2015\u2025",
            Hanging: "\u3001\u3002.,"
          },
          {
            Name: "PhotoshopKinsokuSoft",
            NoStart: "\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF1F\uFF01\u2019\u201D\uFF09\u3015\uFF3D\uFF5D\u3009\u300B\u300D\u300F\u3011\u30FD\u30FE\u309D\u309E\u3005",
            NoEnd: "\u2018\u201C\uFF08\u3014\uFF3B\uFF5B\u3008\u300A\u300C\u300E\u3010",
            Keep: "\u2015\u2025",
            Hanging: "\u3001\u3002.,"
          }
        ],
        MojiKumiSet: [
          { InternalName: "Photoshop6MojiKumiSet1" },
          { InternalName: "Photoshop6MojiKumiSet2" },
          { InternalName: "Photoshop6MojiKumiSet3" },
          { InternalName: "Photoshop6MojiKumiSet4" }
        ],
        TheNormalStyleSheet: 0,
        TheNormalParagraphSheet: 0,
        ParagraphSheetSet: [
          {
            Name: "Normal RGB",
            DefaultStyleSheet: 0,
            Properties: encodeParagraphStyle(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), fonts)
          }
        ],
        StyleSheetSet: [
          {
            Name: "Normal RGB",
            StyleSheetData: styleSheetData
          }
        ],
        FontSet: fonts.map((f) => ({
          Name: f.name,
          Script: f.script || 0,
          FontType: f.type || 0,
          Synthetic: f.synthetic || 0
        })),
        SuperscriptSize: (_d = data.superscriptSize) !== null && _d !== void 0 ? _d : 0.583,
        SuperscriptPosition: (_e = data.superscriptPosition) !== null && _e !== void 0 ? _e : 0.333,
        SubscriptSize: (_f = data.subscriptSize) !== null && _f !== void 0 ? _f : 0.583,
        SubscriptPosition: (_g = data.subscriptPosition) !== null && _g !== void 0 ? _g : 0.333,
        SmallCapSize: (_h = data.smallCapSize) !== null && _h !== void 0 ? _h : 0.7
      };
      const engineData = {
        EngineDict: {
          Editor: { Text: text },
          ParagraphRun: {
            DefaultRunData: {
              ParagraphSheet: { DefaultStyleSheet: 0, Properties: {} },
              Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
            },
            RunArray: paragraphRunArray,
            RunLengthArray: paragraphRunLengthArray,
            IsJoinable: 1
          },
          StyleRun: {
            DefaultRunData: { StyleSheet: { StyleSheetData: {} } },
            RunArray: styleRunArray,
            RunLengthArray: styleRunLengthArray,
            IsJoinable: 2
          },
          GridInfo: {
            GridIsOn: !!gridInfo.isOn,
            ShowGrid: !!gridInfo.show,
            GridSize: (_j = gridInfo.size) !== null && _j !== void 0 ? _j : 18,
            GridLeading: (_k = gridInfo.leading) !== null && _k !== void 0 ? _k : 22,
            GridColor: encodeColor(gridInfo.color),
            GridLeadingFillColor: encodeColor(gridInfo.color),
            AlignLineHeightToGridFlags: !!gridInfo.alignLineHeightToGridFlags
          },
          AntiAlias: antialias.indexOf((_l = data.antiAlias) !== null && _l !== void 0 ? _l : "sharp"),
          UseFractionalGlyphWidths: (_m = data.useFractionalGlyphWidths) !== null && _m !== void 0 ? _m : true,
          Rendered: {
            Version: 1,
            Shapes: {
              WritingDirection,
              Children: [
                {
                  ShapeType,
                  Procession,
                  Lines: { WritingDirection, Children: [] },
                  Cookie: { Photoshop }
                }
              ]
            }
          }
        },
        ResourceDict: Object.assign({}, defaultResources),
        DocumentResources: Object.assign({}, defaultResources)
      };
      return engineData;
    }
  }
});

// node_modules/ag-psd/dist/engineData2.js
var require_engineData2 = __commonJS({
  "node_modules/ag-psd/dist/engineData2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeEngineData2 = decodeEngineData2;
    var keysColor = {
      "0": {
        uproot: true,
        children: {
          "0": { name: "Type" },
          "1": { name: "Values" }
        }
      }
    };
    var keysStyleSheet = {
      "0": { name: "Font" },
      "1": { name: "FontSize" },
      "2": { name: "FauxBold" },
      "3": { name: "FauxItalic" },
      "4": { name: "AutoLeading" },
      "5": { name: "Leading" },
      "6": { name: "HorizontalScale" },
      "7": { name: "VerticalScale" },
      "8": { name: "Tracking" },
      "9": { name: "BaselineShift" },
      // '10': ???
      "11": { name: "Kerning?" },
      // different value than EngineData (0 - numerical value, 1 - metric, 2 - optical)
      "12": { name: "FontCaps" },
      "13": { name: "FontBaseline" },
      "15": { name: "Strikethrough?" },
      // number instead of bool
      "16": { name: "Underline?" },
      // number instead of bool
      "18": { name: "Ligatures" },
      "19": { name: "DLigatures" },
      // '20': ???
      // '21': ???
      // '22': ???
      "23": { name: "Fractions" },
      // not present in EngineData
      "24": { name: "Ordinals" },
      // not present in EngineData
      // '25': ???
      // '26': ???
      // '27': ???
      "28": { name: "StylisticAlternates" },
      // not present in EngineData
      // '29': ???
      "30": { name: "OldStyle?" },
      // OpenType > OldStyle, number instead of bool, not present in EngineData
      "35": { name: "BaselineDirection" },
      "38": { name: "Language" },
      "52": { name: "NoBreak" },
      "53": { name: "FillColor", children: keysColor },
      "54": { name: "StrokeColor", children: keysColor },
      "55": { children: { "99": { uproot: true } } },
      // '68': ???
      // '70': ???
      // '71': ???
      // '72': ???
      // '73': ???
      "79": { children: keysColor }
      // '85': ???
      // '87': ???
      // '88': ???
    };
    var keysParagraph = {
      "0": { name: "Justification" },
      "1": { name: "FirstLineIndent" },
      "2": { name: "StartIndent" },
      "3": { name: "EndIndent" },
      "4": { name: "SpaceBefore" },
      "5": { name: "SpaceAfter" },
      "7": { name: "AutoLeading" },
      "9": { name: "AutoHyphenate" },
      "10": { name: "HyphenatedWordSize" },
      "11": { name: "PreHyphen" },
      "12": { name: "PostHyphen" },
      "13": { name: "ConsecutiveHyphens?" },
      // different value than EngineData
      "14": { name: "Zone" },
      "15": { name: "HypenateCapitalizedWords" },
      // not present in EngineData
      "17": { name: "WordSpacing" },
      "18": { name: "LetterSpacing" },
      "19": { name: "GlyphSpacing" },
      "32": { name: "StyleSheet", children: keysStyleSheet }
    };
    var keysStyleSheetData = {
      name: "StyleSheetData",
      children: keysStyleSheet
    };
    var keysRoot = {
      "0": {
        name: "ResourceDict",
        children: {
          "1": {
            name: "FontSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": {
                        uproot: true,
                        children: {
                          "0": { name: "Name" },
                          "2": { name: "FontType" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "2": {
            name: "2",
            children: {}
          },
          "3": {
            name: "MojiKumiSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "InternalName" }
                    }
                  }
                }
              }
            }
          },
          "4": {
            name: "KinsokuSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "Name" },
                      "5": {
                        uproot: true,
                        children: {
                          "0": { name: "NoStart" },
                          "1": { name: "NoEnd" },
                          "2": { name: "Keep" },
                          "3": { name: "Hanging" },
                          "4": { name: "Name" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "5": {
            name: "StyleSheetSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "Name" },
                      "6": keysStyleSheetData
                    }
                  }
                }
              }
            }
          },
          "6": {
            name: "ParagraphSheetSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "Name" },
                      "5": {
                        name: "Properties",
                        children: keysParagraph
                      },
                      "6": { name: "DefaultStyleSheet" }
                    }
                  }
                }
              }
            }
          },
          "8": {
            name: "TextFrameSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    name: "path",
                    children: {
                      "0": { name: "name" },
                      "1": {
                        name: "bezierCurve",
                        children: {
                          "0": { name: "controlPoints" }
                        }
                      },
                      "2": {
                        name: "data",
                        children: {
                          "0": { name: "type" },
                          "1": { name: "orientation" },
                          "2": { name: "frameMatrix" },
                          "4": { name: "4" },
                          "6": { name: "textRange" },
                          "7": { name: "rowGutter" },
                          "8": { name: "columnGutter" },
                          "9": { name: "9" },
                          "10": {
                            name: "baselineAlignment",
                            children: {
                              "0": { name: "flag" },
                              "1": { name: "min" }
                            }
                          },
                          "11": {
                            name: "pathData",
                            children: {
                              "1": { name: "1" },
                              "0": { name: "reversed" },
                              "2": { name: "2" },
                              "3": { name: "3" },
                              "4": { name: "spacing" },
                              "5": { name: "5" },
                              "6": { name: "6" },
                              "7": { name: "7" },
                              "18": { name: "18" }
                            }
                          },
                          "12": { name: "12" },
                          "13": { name: "13" }
                        }
                      },
                      "3": { name: "3" },
                      "97": { name: "uuid" }
                    }
                  }
                }
              }
            }
          },
          "9": {
            name: "Predefined",
            children: {
              "0": {
                children: { "0": { uproot: true } }
              },
              "1": {
                children: { "0": { uproot: true } }
              }
            }
          }
        }
      },
      "1": {
        name: "EngineDict",
        children: {
          "0": {
            name: "0",
            children: {
              // 0: ???
              // 1: ???
              // 2: ???
              "3": { name: "SuperscriptSize" },
              "4": { name: "SuperscriptPosition" },
              "5": { name: "SubscriptSize" },
              "6": { name: "SubscriptPosition" },
              "7": { name: "SmallCapSize" },
              "8": { name: "UseFractionalGlyphWidths" },
              // ???
              "15": { children: { "0": { uproot: true } } }
              // 16: ???
              // 17: ???
            }
          },
          "1": {
            name: "Editors?",
            // layer.text.index is specifying the index of the editor related to the layer
            children: {
              "0": {
                name: "Editor",
                children: {
                  "0": { name: "Text" },
                  "5": {
                    name: "ParagraphRun",
                    children: {
                      "0": {
                        name: "RunArray",
                        children: {
                          "0": {
                            name: "ParagraphSheet",
                            children: {
                              "0": {
                                uproot: true,
                                children: {
                                  "0": { name: "0" },
                                  "5": {
                                    name: "5",
                                    children: keysParagraph
                                  },
                                  "6": { name: "6" }
                                }
                              }
                            }
                          },
                          "1": { name: "RunLength" }
                        }
                      }
                    }
                  },
                  "6": {
                    name: "StyleRun",
                    children: {
                      "0": {
                        name: "RunArray",
                        children: {
                          "0": {
                            name: "StyleSheet",
                            children: {
                              "0": {
                                uproot: true,
                                children: {
                                  "6": keysStyleSheetData
                                }
                              }
                            }
                          },
                          "1": { name: "RunLength" }
                        }
                      }
                    }
                  }
                }
              },
              "1": {
                name: "FontVectorData ???"
                // children: {
                // 	'0': {},
                // 	'2': {
                // 		// '5'
                // 		// '6'
                // 	},
                // }
                //     "1": [ // this is probably bounding box? there seem to be many of them nested
                //       0,
                //       0,
                //       999,
                //       176.30014
                //     ],
                // various types: /PC, /F, /R, /L, /S, /G
              }
            }
          },
          "2": {
            name: "StyleSheet",
            children: keysStyleSheet
          },
          "3": {
            name: "ParagraphSheet",
            children: keysParagraph
          }
        }
      }
    };
    function decodeObj(obj, keys) {
      var _a2, _b2;
      if (obj === null)
        return obj;
      if (Array.isArray(obj))
        return obj.map((x2) => decodeObj(x2, keys));
      if (typeof obj !== "object")
        return obj;
      let result = {};
      for (const key of Object.keys(obj)) {
        if (keys[key]) {
          if (keys[key].uproot) {
            if (key !== "99")
              result = decodeObj(obj[key], (_a2 = keys[key].children) !== null && _a2 !== void 0 ? _a2 : {});
            if (obj["99"])
              result._type = obj["99"];
            break;
          } else {
            result[keys[key].name || key] = decodeObj(obj[key], (_b2 = keys[key].children) !== null && _b2 !== void 0 ? _b2 : {});
          }
        } else if (key === "99") {
          result._type = obj[key];
        } else {
          result[key] = decodeObj(obj[key], {});
        }
      }
      return result;
    }
    function decodeEngineData2(data) {
      return decodeObj(data, keysRoot);
    }
  }
});

// node_modules/ag-psd/dist/additionalInfo.js
var require_additionalInfo = __commonJS({
  "node_modules/ag-psd/dist/additionalInfo.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.booleanOperations = exports.infoHandlersMap = exports.infoHandlers = void 0;
    exports.readBezierKnot = readBezierKnot;
    exports.readVectorMask = readVectorMask;
    exports.hasMultiEffects = hasMultiEffects;
    var base64_js_1 = require_base64_js();
    var effectsHelpers_1 = require_effectsHelpers();
    var helpers_1 = require_helpers();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var descriptor_1 = require_descriptor();
    var engineData_1 = require_engineData();
    var text_1 = require_text();
    var engineData2_1 = require_engineData2();
    var fromAtoZ = "abcdefghijklmnopqrstuvwxyz";
    exports.infoHandlers = [];
    exports.infoHandlersMap = {};
    function addHandler(key, has, read, write) {
      const handler = { key, has, read, write };
      exports.infoHandlers.push(handler);
      exports.infoHandlersMap[handler.key] = handler;
    }
    function addHandlerAlias(key, target) {
      exports.infoHandlersMap[key] = exports.infoHandlersMap[target];
    }
    function hasKey(key) {
      return (target) => target[key] !== void 0;
    }
    function readLength64(reader) {
      if ((0, psdReader_1.readUint32)(reader))
        throw new Error(`Resource size above 4 GB limit at ${reader.offset.toString(16)}`);
      return (0, psdReader_1.readUint32)(reader);
    }
    function writeLength64(writer, length) {
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, psdWriter_1.writeUint32)(writer, length);
    }
    addHandler("TySh", hasKey("text"), (reader, target, leftBytes) => {
      if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid TySh version`);
      const transform = [];
      for (let i2 = 0; i2 < 6; i2++)
        transform.push((0, psdReader_1.readFloat64)(reader));
      if ((0, psdReader_1.readInt16)(reader) !== 50)
        throw new Error(`Invalid TySh text version`);
      const text = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid TySh warp version`);
      const warp = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.text = {
        transform,
        left: (0, psdReader_1.readFloat32)(reader),
        top: (0, psdReader_1.readFloat32)(reader),
        right: (0, psdReader_1.readFloat32)(reader),
        bottom: (0, psdReader_1.readFloat32)(reader),
        text: text["Txt "].replace(/\r/g, "\n"),
        index: text.TextIndex || 0,
        gridding: descriptor_1.textGridding.decode(text.textGridding),
        antiAlias: descriptor_1.Annt.decode(text.AntA),
        orientation: descriptor_1.Ornt.decode(text.Ornt),
        warp: {
          style: descriptor_1.warpStyle.decode(warp.warpStyle),
          value: warp.warpValue || 0,
          perspective: warp.warpPerspective || 0,
          perspectiveOther: warp.warpPerspectiveOther || 0,
          rotate: descriptor_1.Ornt.decode(warp.warpRotate)
        }
      };
      if (text.bounds)
        target.text.bounds = (0, descriptor_1.descBoundsToBounds)(text.bounds);
      if (text.boundingBox)
        target.text.boundingBox = (0, descriptor_1.descBoundsToBounds)(text.boundingBox);
      if (text.EngineData) {
        const engineData = (0, engineData_1.parseEngineData)(text.EngineData);
        const textData = (0, text_1.decodeEngineData)(engineData);
        target.text = Object.assign(Object.assign({}, target.text), textData);
      }
      (0, psdReader_1.skipBytes)(reader, leftBytes());
    }, (writer, target) => {
      const text = target.text;
      const warp = text.warp || {};
      const transform = text.transform || [1, 0, 0, 1, 0, 0];
      const textDescriptor = Object.assign(Object.assign(Object.assign({ "Txt ": (text.text || "").replace(/\r?\n/g, "\r"), textGridding: descriptor_1.textGridding.encode(text.gridding), Ornt: descriptor_1.Ornt.encode(text.orientation), AntA: descriptor_1.Annt.encode(text.antiAlias) }, text.bounds ? { bounds: (0, descriptor_1.boundsToDescBounds)(text.bounds) } : {}), text.boundingBox ? { boundingBox: (0, descriptor_1.boundsToDescBounds)(text.boundingBox) } : {}), { TextIndex: text.index || 0, EngineData: (0, engineData_1.serializeEngineData)((0, text_1.encodeEngineData)(text)) });
      (0, psdWriter_1.writeInt16)(writer, 1);
      for (let i2 = 0; i2 < 6; i2++) {
        (0, psdWriter_1.writeFloat64)(writer, transform[i2]);
      }
      (0, psdWriter_1.writeInt16)(writer, 50);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "TxLr", textDescriptor, "text");
      (0, psdWriter_1.writeInt16)(writer, 1);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "warp", encodeWarp(warp));
      (0, psdWriter_1.writeFloat32)(writer, text.left);
      (0, psdWriter_1.writeFloat32)(writer, text.top);
      (0, psdWriter_1.writeFloat32)(writer, text.right);
      (0, psdWriter_1.writeFloat32)(writer, text.bottom);
    });
    addHandler("SoCo", (target) => target.vectorFill !== void 0 && target.vectorStroke === void 0 && target.vectorFill.type === "color", (reader, target) => {
      const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
    }, (writer, target) => {
      const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    addHandler("GdFl", (target) => target.vectorFill !== void 0 && target.vectorStroke === void 0 && (target.vectorFill.type === "solid" || target.vectorFill.type === "noise"), (reader, target, left) => {
      const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    addHandler("PtFl", (target) => target.vectorFill !== void 0 && target.vectorStroke === void 0 && target.vectorFill.type === "pattern", (reader, target) => {
      const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
    }, (writer, target) => {
      const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    addHandler("vscg", (target) => target.vectorFill !== void 0 && target.vectorStroke !== void 0, (reader, target, left) => {
      (0, psdReader_1.readSignature)(reader);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(desc);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const { descriptor, key } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, psdWriter_1.writeSignature)(writer, key);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    function readBezierKnot(reader, width, height) {
      const y0 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
      const x0 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
      const y1 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
      const x1 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
      const y2 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
      const x2 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
      return [x0, y0, x1, y1, x2, y2];
    }
    function writeBezierKnot(writer, points, width, height) {
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[1] / height);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[0] / width);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[3] / height);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[2] / width);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[5] / height);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[4] / width);
    }
    exports.booleanOperations = ["exclude", "combine", "subtract", "intersect"];
    function readVectorMask(reader, vectorMask, width, height, size) {
      const end = reader.offset + size;
      const paths = vectorMask.paths;
      let path = void 0;
      while (end - reader.offset >= 26) {
        const selector = (0, psdReader_1.readUint16)(reader);
        switch (selector) {
          case 0:
          // Closed subpath length record
          case 3: {
            (0, psdReader_1.readUint16)(reader);
            const boolOp = (0, psdReader_1.readInt16)(reader);
            const flags = (0, psdReader_1.readUint16)(reader);
            (0, psdReader_1.skipBytes)(reader, 18);
            path = {
              open: selector === 3,
              knots: [],
              fillRule: flags === 2 ? "non-zero" : "even-odd"
            };
            if (boolOp !== -1)
              path.operation = exports.booleanOperations[boolOp];
            paths.push(path);
            break;
          }
          case 1:
          // Closed subpath Bezier knot, linked
          case 2:
          // Closed subpath Bezier knot, unlinked
          case 4:
          // Open subpath Bezier knot, linked
          case 5:
            path.knots.push({ linked: selector === 1 || selector === 4, points: readBezierKnot(reader, width, height) });
            break;
          case 6:
            (0, psdReader_1.skipBytes)(reader, 24);
            break;
          case 7: {
            const top = (0, psdReader_1.readFixedPointPath32)(reader);
            const left = (0, psdReader_1.readFixedPointPath32)(reader);
            const bottom = (0, psdReader_1.readFixedPointPath32)(reader);
            const right = (0, psdReader_1.readFixedPointPath32)(reader);
            const resolution = (0, psdReader_1.readFixedPointPath32)(reader);
            (0, psdReader_1.skipBytes)(reader, 4);
            vectorMask.clipboard = { top, left, bottom, right, resolution };
            break;
          }
          case 8:
            vectorMask.fillStartsWithAllPixels = !!(0, psdReader_1.readUint16)(reader);
            (0, psdReader_1.skipBytes)(reader, 22);
            break;
          default:
            throw new Error("Invalid vmsk section");
        }
      }
      return paths;
    }
    addHandler("vmsk", hasKey("vectorMask"), (reader, target, left, { width, height }) => {
      if ((0, psdReader_1.readUint32)(reader) !== 3)
        throw new Error("Invalid vmsk version");
      target.vectorMask = { paths: [] };
      const vectorMask = target.vectorMask;
      const flags = (0, psdReader_1.readUint32)(reader);
      vectorMask.invert = (flags & 1) !== 0;
      vectorMask.notLink = (flags & 2) !== 0;
      vectorMask.disable = (flags & 4) !== 0;
      readVectorMask(reader, vectorMask, width, height, left());
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target, { width, height }) => {
      const vectorMask = target.vectorMask;
      const flags = (vectorMask.invert ? 1 : 0) | (vectorMask.notLink ? 2 : 0) | (vectorMask.disable ? 4 : 0);
      (0, psdWriter_1.writeUint32)(writer, 3);
      (0, psdWriter_1.writeUint32)(writer, flags);
      (0, psdWriter_1.writeUint16)(writer, 6);
      (0, psdWriter_1.writeZeros)(writer, 24);
      const clipboard = vectorMask.clipboard;
      if (clipboard) {
        (0, psdWriter_1.writeUint16)(writer, 7);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.top);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.left);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.bottom);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.right);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.resolution);
        (0, psdWriter_1.writeZeros)(writer, 4);
      }
      (0, psdWriter_1.writeUint16)(writer, 8);
      (0, psdWriter_1.writeUint16)(writer, vectorMask.fillStartsWithAllPixels ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 22);
      for (const path of vectorMask.paths) {
        (0, psdWriter_1.writeUint16)(writer, path.open ? 3 : 0);
        (0, psdWriter_1.writeUint16)(writer, path.knots.length);
        (0, psdWriter_1.writeUint16)(writer, path.operation ? exports.booleanOperations.indexOf(path.operation) : -1);
        (0, psdWriter_1.writeUint16)(writer, path.fillRule === "non-zero" ? 2 : 1);
        (0, psdWriter_1.writeZeros)(writer, 18);
        const linkedKnot = path.open ? 4 : 1;
        const unlinkedKnot = path.open ? 5 : 2;
        for (const { linked, points } of path.knots) {
          (0, psdWriter_1.writeUint16)(writer, linked ? linkedKnot : unlinkedKnot);
          writeBezierKnot(writer, points, width, height);
        }
      }
    });
    addHandlerAlias("vsms", "vmsk");
    addHandler(
      "vowv",
      // something with vectors?
      hasKey("vowv"),
      (reader, target) => {
        target.vowv = (0, psdReader_1.readUint32)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint32)(writer, target.vowv);
      }
    );
    addHandler("vogk", hasKey("vectorOrigination"), (reader, target, left) => {
      if ((0, psdReader_1.readInt32)(reader) !== 1)
        throw new Error(`Invalid vogk version`);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorOrigination = { keyDescriptorList: [] };
      for (const i2 of desc.keyDescriptorList) {
        const item = {};
        if (i2.keyShapeInvalidated != null)
          item.keyShapeInvalidated = i2.keyShapeInvalidated;
        if (i2.keyOriginType != null)
          item.keyOriginType = i2.keyOriginType;
        if (i2.keyOriginResolution != null)
          item.keyOriginResolution = i2.keyOriginResolution;
        if (i2.keyOriginShapeBBox) {
          item.keyOriginShapeBoundingBox = {
            top: (0, descriptor_1.parseUnitsOrNumber)(i2.keyOriginShapeBBox["Top "]),
            left: (0, descriptor_1.parseUnitsOrNumber)(i2.keyOriginShapeBBox.Left),
            bottom: (0, descriptor_1.parseUnitsOrNumber)(i2.keyOriginShapeBBox.Btom),
            right: (0, descriptor_1.parseUnitsOrNumber)(i2.keyOriginShapeBBox.Rght)
          };
        }
        const rectRadii = i2.keyOriginRRectRadii;
        if (rectRadii) {
          item.keyOriginRRectRadii = {
            topRight: (0, descriptor_1.parseUnits)(rectRadii.topRight),
            topLeft: (0, descriptor_1.parseUnits)(rectRadii.topLeft),
            bottomLeft: (0, descriptor_1.parseUnits)(rectRadii.bottomLeft),
            bottomRight: (0, descriptor_1.parseUnits)(rectRadii.bottomRight)
          };
        }
        const corners = i2.keyOriginBoxCorners;
        if (corners) {
          item.keyOriginBoxCorners = [
            { x: corners.rectangleCornerA.Hrzn, y: corners.rectangleCornerA.Vrtc },
            { x: corners.rectangleCornerB.Hrzn, y: corners.rectangleCornerB.Vrtc },
            { x: corners.rectangleCornerC.Hrzn, y: corners.rectangleCornerC.Vrtc },
            { x: corners.rectangleCornerD.Hrzn, y: corners.rectangleCornerD.Vrtc }
          ];
        }
        const trnf = i2.Trnf;
        if (trnf) {
          item.transform = [trnf.xx, trnf.xy, trnf.yx, trnf.yy, trnf.tx, trnf.ty];
        }
        target.vectorOrigination.keyDescriptorList.push(item);
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      target;
      const orig = target.vectorOrigination;
      const desc = { keyDescriptorList: [] };
      for (let i2 = 0; i2 < orig.keyDescriptorList.length; i2++) {
        const item = orig.keyDescriptorList[i2];
        desc.keyDescriptorList.push({});
        const out = desc.keyDescriptorList[desc.keyDescriptorList.length - 1];
        if (item.keyOriginType != null)
          out.keyOriginType = item.keyOriginType;
        if (item.keyOriginResolution != null)
          out.keyOriginResolution = item.keyOriginResolution;
        const radii = item.keyOriginRRectRadii;
        if (radii) {
          out.keyOriginRRectRadii = {
            unitValueQuadVersion: 1,
            topRight: (0, descriptor_1.unitsValue)(radii.topRight, "topRight"),
            topLeft: (0, descriptor_1.unitsValue)(radii.topLeft, "topLeft"),
            bottomLeft: (0, descriptor_1.unitsValue)(radii.bottomLeft, "bottomLeft"),
            bottomRight: (0, descriptor_1.unitsValue)(radii.bottomRight, "bottomRight")
          };
        }
        const box = item.keyOriginShapeBoundingBox;
        if (box) {
          out.keyOriginShapeBBox = {
            unitValueQuadVersion: 1,
            "Top ": (0, descriptor_1.unitsValue)(box.top, "top"),
            Left: (0, descriptor_1.unitsValue)(box.left, "left"),
            Btom: (0, descriptor_1.unitsValue)(box.bottom, "bottom"),
            Rght: (0, descriptor_1.unitsValue)(box.right, "right")
          };
        }
        const corners = item.keyOriginBoxCorners;
        if (corners && corners.length === 4) {
          out.keyOriginBoxCorners = {
            rectangleCornerA: { Hrzn: corners[0].x, Vrtc: corners[0].y },
            rectangleCornerB: { Hrzn: corners[1].x, Vrtc: corners[1].y },
            rectangleCornerC: { Hrzn: corners[2].x, Vrtc: corners[2].y },
            rectangleCornerD: { Hrzn: corners[3].x, Vrtc: corners[3].y }
          };
        }
        const transform = item.transform;
        if (transform && transform.length === 6) {
          out.Trnf = {
            xx: transform[0],
            xy: transform[1],
            yx: transform[2],
            yy: transform[3],
            tx: transform[4],
            ty: transform[5]
          };
        }
        if (item.keyShapeInvalidated != null)
          out.keyShapeInvalidated = item.keyShapeInvalidated;
        out.keyOriginIndex = i2;
      }
      (0, psdWriter_1.writeInt32)(writer, 1);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("lmfx", (target) => target.effects !== void 0 && hasMultiEffects(target.effects), (reader, target, left) => {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 0)
        throw new Error("Invalid lmfx version");
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.effects = (0, descriptor_1.parseEffects)(desc, !!reader.logMissingFeatures);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target, _, options) => {
      const desc = (0, descriptor_1.serializeEffects)(target.effects, !!options.logMissingFeatures, true);
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("lrFX", hasKey("effects"), (reader, target, left) => {
      if (!target.effects)
        target.effects = (0, effectsHelpers_1.readEffects)(reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      (0, effectsHelpers_1.writeEffects)(writer, target.effects);
    });
    addHandler("luni", hasKey("name"), (reader, target, left) => {
      if (left() > 4) {
        const length = (0, psdReader_1.readUint32)(reader);
        if (left() >= length * 2) {
          target.name = (0, psdReader_1.readUnicodeStringWithLength)(reader, length);
        } else {
          if (reader.logDevFeatures)
            reader.log("name in luni section is too long");
        }
      } else {
        if (reader.logDevFeatures)
          reader.log("empty luni section");
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      (0, psdWriter_1.writeUnicodeString)(writer, target.name);
    });
    addHandler("lnsr", hasKey("nameSource"), (reader, target) => target.nameSource = (0, psdReader_1.readSignature)(reader), (writer, target) => (0, psdWriter_1.writeSignature)(writer, target.nameSource));
    addHandler("lyid", hasKey("id"), (reader, target) => {
      target.id = (0, psdReader_1.readUint32)(reader);
    }, (writer, target, _psd, options) => {
      let id = target.id;
      while (options.layerIds.has(id))
        id += 100;
      (0, psdWriter_1.writeUint32)(writer, id);
      options.layerIds.add(id);
      options.layerToId.set(target, id);
    });
    addHandler("lsct", hasKey("sectionDivider"), (reader, target, left) => {
      target.sectionDivider = { type: (0, psdReader_1.readUint32)(reader) };
      if (left()) {
        (0, psdReader_1.checkSignature)(reader, "8BIM");
        target.sectionDivider.key = (0, psdReader_1.readSignature)(reader);
      }
      if (left()) {
        target.sectionDivider.subType = (0, psdReader_1.readUint32)(reader);
      }
    }, (writer, target) => {
      (0, psdWriter_1.writeUint32)(writer, target.sectionDivider.type);
      if (target.sectionDivider.key) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, target.sectionDivider.key);
        if (target.sectionDivider.subType !== void 0) {
          (0, psdWriter_1.writeUint32)(writer, target.sectionDivider.subType);
        }
      }
    });
    addHandlerAlias("lsdk", "lsct");
    addHandler("clbl", hasKey("blendClippendElements"), (reader, target) => {
      target.blendClippendElements = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.blendClippendElements ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("infx", hasKey("blendInteriorElements"), (reader, target) => {
      target.blendInteriorElements = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.blendInteriorElements ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("knko", hasKey("knockout"), (reader, target) => {
      target.knockout = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.knockout ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("lmgm", hasKey("layerMaskAsGlobalMask"), (reader, target) => {
      target.layerMaskAsGlobalMask = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.layerMaskAsGlobalMask ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("lspf", hasKey("protected"), (reader, target) => {
      const flags = (0, psdReader_1.readUint32)(reader);
      target.protected = {
        transparency: (flags & 1) !== 0,
        composite: (flags & 2) !== 0,
        position: (flags & 4) !== 0
      };
      if (flags & 8)
        target.protected.artboards = true;
    }, (writer, target) => {
      const flags = (target.protected.transparency ? 1 : 0) | (target.protected.composite ? 2 : 0) | (target.protected.position ? 4 : 0) | (target.protected.artboards ? 8 : 0);
      (0, psdWriter_1.writeUint32)(writer, flags);
    });
    addHandler("lclr", hasKey("layerColor"), (reader, target) => {
      const color = (0, psdReader_1.readUint16)(reader);
      (0, psdReader_1.skipBytes)(reader, 6);
      target.layerColor = helpers_1.layerColors[color];
    }, (writer, target) => {
      const index = helpers_1.layerColors.indexOf(target.layerColor);
      (0, psdWriter_1.writeUint16)(writer, index === -1 ? 0 : index);
      (0, psdWriter_1.writeZeros)(writer, 6);
    });
    addHandler(
      "shmd",
      // Metadata setting
      // Metadata setting
      (target) => target.timestamp !== void 0 || target.animationFrames !== void 0 || target.animationFrameFlags !== void 0 || target.timeline !== void 0 || target.comps !== void 0,
      (reader, target, left) => {
        const count = (0, psdReader_1.readUint32)(reader);
        for (let i2 = 0; i2 < count; i2++) {
          (0, psdReader_1.checkSignature)(reader, "8BIM");
          const key = (0, psdReader_1.readSignature)(reader);
          (0, psdReader_1.readUint8)(reader);
          (0, psdReader_1.skipBytes)(reader, 3);
          (0, psdReader_1.readSection)(reader, 1, (left2) => {
            if (key === "cust") {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
              if (desc.layerTime !== void 0)
                target.timestamp = desc.layerTime;
            } else if (key === "mlst") {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
              target.animationFrames = [];
              for (let i3 = 0; i3 < desc.LaSt.length; i3++) {
                const f = desc.LaSt[i3];
                const frame = { frames: f.FrLs };
                if (f.enab !== void 0)
                  frame.enable = f.enab;
                if (f.Ofst)
                  frame.offset = (0, descriptor_1.horzVrtcToXY)(f.Ofst);
                if (f.FXRf)
                  frame.referencePoint = (0, descriptor_1.horzVrtcToXY)(f.FXRf);
                if (f.Lefx)
                  frame.effects = (0, descriptor_1.parseEffects)(f.Lefx, !!reader.logMissingFeatures);
                if (f.blendOptions && f.blendOptions.Opct)
                  frame.opacity = (0, descriptor_1.parsePercent)(f.blendOptions.Opct);
                target.animationFrames.push(frame);
              }
            } else if (key === "mdyn") {
              (0, psdReader_1.readUint16)(reader);
              const propagate = (0, psdReader_1.readUint8)(reader);
              const flags = (0, psdReader_1.readUint8)(reader);
              target.animationFrameFlags = {
                propagateFrameOne: !propagate,
                unifyLayerPosition: (flags & 1) !== 0,
                unifyLayerStyle: (flags & 2) !== 0,
                unifyLayerVisibility: (flags & 4) !== 0
              };
            } else if (key === "tmln") {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
              const timeScope = desc.timeScope;
              const timeline = {
                start: (0, descriptor_1.frac)(timeScope.Strt),
                duration: (0, descriptor_1.frac)(timeScope.duration),
                inTime: (0, descriptor_1.frac)(timeScope.inTime),
                outTime: (0, descriptor_1.frac)(timeScope.outTime),
                autoScope: desc.autoScope,
                audioLevel: desc.audioLevel
              };
              if (desc.trackList) {
                timeline.tracks = (0, descriptor_1.parseTrackList)(desc.trackList, !!reader.logMissingFeatures);
              }
              target.timeline = timeline;
            } else if (key === "cmls") {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
              target.comps = {
                settings: []
              };
              if (desc.origFXRefPoint)
                target.comps.originalEffectsReferencePoint = { x: desc.origFXRefPoint.Hrzn, y: desc.origFXRefPoint.Vrtc };
              for (const item of desc.layerSettings) {
                target.comps.settings.push({ compList: item.compList });
                const t = target.comps.settings[target.comps.settings.length - 1];
                if ("enab" in item)
                  t.enabled = item.enab;
                if (item.Ofst)
                  t.offset = { x: item.Ofst.Hrzn, y: item.Ofst.Vrtc };
                if (item.FXRefPoint)
                  t.effectsReferencePoint = { x: item.FXRefPoint.Hrzn, y: item.FXRefPoint.Vrtc };
              }
            } else if (key === "extn") {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
              desc;
              reader.logMissingFeatures && reader.log('Unhandled "shmd" section key', key);
            } else {
              reader.logMissingFeatures && reader.log('Unhandled "shmd" section key', key);
            }
            (0, psdReader_1.skipBytes)(reader, left2());
          });
        }
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target, _, options) => {
        const { animationFrames, animationFrameFlags, timestamp, timeline, comps } = target;
        let count = 0;
        if (animationFrames)
          count++;
        if (animationFrameFlags)
          count++;
        if (timeline)
          count++;
        if (timestamp !== void 0)
          count++;
        if (comps)
          count++;
        (0, psdWriter_1.writeUint32)(writer, count);
        if (animationFrames) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "mlst");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            var _a2;
            const desc = {
              LaID: (_a2 = target.id) !== null && _a2 !== void 0 ? _a2 : 0,
              LaSt: []
            };
            for (let i2 = 0; i2 < animationFrames.length; i2++) {
              const f = animationFrames[i2];
              const frame = {};
              if (f.enable !== void 0)
                frame.enab = f.enable;
              frame.FrLs = f.frames;
              if (f.offset)
                frame.Ofst = (0, descriptor_1.xyToHorzVrtc)(f.offset);
              if (f.referencePoint)
                frame.FXRf = (0, descriptor_1.xyToHorzVrtc)(f.referencePoint);
              if (f.effects)
                frame.Lefx = (0, descriptor_1.serializeEffects)(f.effects, false, false);
              if (f.opacity !== void 0)
                frame.blendOptions = { Opct: (0, descriptor_1.unitsPercent)(f.opacity) };
              desc.LaSt.push(frame);
            }
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
          }, true);
        }
        if (animationFrameFlags) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "mdyn");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            (0, psdWriter_1.writeUint16)(writer, 0);
            (0, psdWriter_1.writeUint8)(writer, animationFrameFlags.propagateFrameOne ? 0 : 15);
            (0, psdWriter_1.writeUint8)(writer, (animationFrameFlags.unifyLayerPosition ? 1 : 0) | (animationFrameFlags.unifyLayerStyle ? 2 : 0) | (animationFrameFlags.unifyLayerVisibility ? 4 : 0));
          });
        }
        if (timeline) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "tmln");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
              Vrsn: 1,
              timeScope: {
                Vrsn: 1,
                Strt: timeline.start,
                duration: timeline.duration,
                inTime: timeline.inTime,
                outTime: timeline.outTime
              },
              autoScope: timeline.autoScope,
              audioLevel: timeline.audioLevel
            };
            if (timeline.tracks) {
              desc.trackList = (0, descriptor_1.serializeTrackList)(timeline.tracks);
            }
            const id = options.layerToId.get(target) || target.id;
            if (!id)
              throw new Error("You need to provide layer.id value whan writing document with animations");
            desc.LyrI = id;
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "anim");
          }, true);
        }
        if (timestamp !== void 0) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "cust");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
              layerTime: timestamp
            };
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "metadata", desc);
          }, true);
        }
        if (comps) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "cmls");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const id = options.layerToId.get(target) || target.id;
            if (!id)
              throw new Error("You need to provide layer.id value whan writing document with layer comps");
            const desc = {};
            if (comps.originalEffectsReferencePoint) {
              desc.origFXRefPoint = { Hrzn: comps.originalEffectsReferencePoint.x, Vrtc: comps.originalEffectsReferencePoint.y };
            }
            desc.LyrI = id;
            desc.layerSettings = [];
            for (const item of comps.settings) {
              const t = {};
              if (item.enabled !== void 0)
                t.enab = item.enabled;
              if (item.offset)
                t.Ofst = { Hrzn: item.offset.x, Vrtc: item.offset.y };
              if (item.effectsReferencePoint)
                t.FXRefPoint = { Hrzn: item.effectsReferencePoint.x, Vrtc: item.effectsReferencePoint.y };
              t.compList = item.compList;
              desc.layerSettings.push(t);
            }
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
          }, true);
        }
      }
    );
    addHandler("PxSc", () => false, (reader, target) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
      if (desc.pixelSourceType === 1986285651) {
        target.pixelSource = {
          type: "vdPS",
          origin: { x: desc.origin.Hrzn, y: desc.origin.Vrtc },
          interpretation: {
            interpretAlpha: desc.interpretation.interpretAlpha.split(".")[1],
            profile: desc.interpretation.profile
          },
          frameReader: {
            type: "QTFR",
            link: {
              name: desc.frameReader["Lnk "]["Nm  "],
              fullPath: desc.frameReader["Lnk "].fullPath,
              originalPath: desc.frameReader["Lnk "].originalPath,
              relativePath: desc.frameReader["Lnk "].relPath,
              alias: desc.frameReader["Lnk "].alis
            },
            mediaDescriptor: desc.frameReader.mediaDescriptor
          },
          showAlteredVideo: desc.showAlteredVideo
        };
      } else {
        reader.log(`Unknown pixelSourceType`);
      }
    }, (writer, target) => {
      const source = target.pixelSource;
      const desc = {
        _name: "",
        _classID: "PixelSource",
        pixelSourceType: 1986285651,
        // vdP
        descVersion: 1,
        origin: { Hrzn: source.origin.x, Vrtc: source.origin.y },
        interpretation: {
          _name: "",
          _classID: "footageInterpretation",
          Vrsn: 1,
          interpretAlpha: `alphaInterpretation.${source.interpretation.interpretAlpha}`,
          profile: source.interpretation.profile
        },
        frameReader: {
          _name: "",
          _classID: "FrameReader",
          frameReaderType: 1364477522,
          // QTF
          descVersion: 1,
          "Lnk ": {
            _name: "",
            _classID: "ExternalFileLink",
            descVersion: 2,
            "Nm  ": source.frameReader.link.name,
            fullPath: source.frameReader.link.fullPath,
            originalPath: source.frameReader.link.originalPath,
            alis: source.frameReader.link.alias,
            relPath: source.frameReader.link.relativePath
          },
          mediaDescriptor: source.frameReader.mediaDescriptor
        },
        showAlteredVideo: source.showAlteredVideo
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "PixelSource", desc);
    });
    addHandler("vstk", hasKey("vectorStroke"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorStroke = {
        strokeEnabled: desc.strokeEnabled,
        fillEnabled: desc.fillEnabled,
        lineWidth: (0, descriptor_1.parseUnits)(desc.strokeStyleLineWidth),
        lineDashOffset: (0, descriptor_1.parseUnits)(desc.strokeStyleLineDashOffset),
        miterLimit: desc.strokeStyleMiterLimit,
        lineCapType: descriptor_1.strokeStyleLineCapType.decode(desc.strokeStyleLineCapType),
        lineJoinType: descriptor_1.strokeStyleLineJoinType.decode(desc.strokeStyleLineJoinType),
        lineAlignment: descriptor_1.strokeStyleLineAlignment.decode(desc.strokeStyleLineAlignment),
        scaleLock: desc.strokeStyleScaleLock,
        strokeAdjust: desc.strokeStyleStrokeAdjust,
        lineDashSet: desc.strokeStyleLineDashSet.map(descriptor_1.parseUnits),
        blendMode: descriptor_1.BlnM.decode(desc.strokeStyleBlendMode),
        opacity: (0, descriptor_1.parsePercent)(desc.strokeStyleOpacity),
        content: (0, descriptor_1.parseVectorContent)(desc.strokeStyleContent),
        resolution: desc.strokeStyleResolution
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a2, _b2, _c;
      const stroke = target.vectorStroke;
      const desc = {
        strokeStyleVersion: 2,
        strokeEnabled: !!stroke.strokeEnabled,
        fillEnabled: !!stroke.fillEnabled,
        strokeStyleLineWidth: stroke.lineWidth || { value: 3, units: "Points" },
        strokeStyleLineDashOffset: stroke.lineDashOffset || { value: 0, units: "Points" },
        strokeStyleMiterLimit: (_a2 = stroke.miterLimit) !== null && _a2 !== void 0 ? _a2 : 100,
        strokeStyleLineCapType: descriptor_1.strokeStyleLineCapType.encode(stroke.lineCapType),
        strokeStyleLineJoinType: descriptor_1.strokeStyleLineJoinType.encode(stroke.lineJoinType),
        strokeStyleLineAlignment: descriptor_1.strokeStyleLineAlignment.encode(stroke.lineAlignment),
        strokeStyleScaleLock: !!stroke.scaleLock,
        strokeStyleStrokeAdjust: !!stroke.strokeAdjust,
        strokeStyleLineDashSet: stroke.lineDashSet || [],
        strokeStyleBlendMode: descriptor_1.BlnM.encode(stroke.blendMode),
        strokeStyleOpacity: (0, descriptor_1.unitsPercent)((_b2 = stroke.opacity) !== null && _b2 !== void 0 ? _b2 : 1),
        strokeStyleContent: (0, descriptor_1.serializeVectorContent)(stroke.content || { type: "color", color: { r: 0, g: 0, b: 0 } }).descriptor,
        strokeStyleResolution: (_c = stroke.resolution) !== null && _c !== void 0 ? _c : 72
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "strokeStyle", desc);
    });
    addHandler(
      "artb",
      // per-layer arboard info
      hasKey("artboard"),
      (reader, target, left) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        const rect = desc.artboardRect;
        target.artboard = {
          rect: { top: rect["Top "], left: rect.Left, bottom: rect.Btom, right: rect.Rght },
          guideIndices: desc.guideIndeces,
          presetName: desc.artboardPresetName,
          color: (0, descriptor_1.parseColor)(desc["Clr "]),
          backgroundType: desc.artboardBackgroundType
        };
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        var _a2;
        const artboard = target.artboard;
        const rect = artboard.rect;
        const desc = {
          artboardRect: { "Top ": rect.top, Left: rect.left, Btom: rect.bottom, Rght: rect.right },
          guideIndeces: artboard.guideIndices || [],
          artboardPresetName: artboard.presetName || "",
          "Clr ": (0, descriptor_1.serializeColor)(artboard.color),
          artboardBackgroundType: (_a2 = artboard.backgroundType) !== null && _a2 !== void 0 ? _a2 : 1
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "artboard", desc);
      }
    );
    addHandler("sn2P", hasKey("usingAlignedRendering"), (reader, target) => target.usingAlignedRendering = !!(0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.usingAlignedRendering ? 1 : 0));
    var placedLayerTypes = ["unknown", "vector", "raster", "image stack"];
    function parseWarp(warp) {
      var _a2, _b2, _c, _d, _e, _f;
      const result = Object.assign(Object.assign({ style: descriptor_1.warpStyle.decode(warp.warpStyle) }, warp.warpValues ? { values: warp.warpValues } : { value: warp.warpValue || 0 }), { perspective: warp.warpPerspective || 0, perspectiveOther: warp.warpPerspectiveOther || 0, rotate: descriptor_1.Ornt.decode(warp.warpRotate), bounds: warp.bounds && {
        top: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds["Top "]),
        left: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Left),
        bottom: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Btom),
        right: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Rght)
      }, uOrder: warp.uOrder, vOrder: warp.vOrder });
      if (warp.deformNumRows != null || warp.deformNumCols != null) {
        result.deformNumRows = warp.deformNumRows;
        result.deformNumCols = warp.deformNumCols;
      }
      const envelopeWarp = warp.customEnvelopeWarp;
      if (envelopeWarp) {
        result.customEnvelopeWarp = {
          meshPoints: []
        };
        const xs = ((_a2 = envelopeWarp.meshPoints.find((i2) => i2.type === "Hrzn")) === null || _a2 === void 0 ? void 0 : _a2.values) || [];
        const ys = ((_b2 = envelopeWarp.meshPoints.find((i2) => i2.type === "Vrtc")) === null || _b2 === void 0 ? void 0 : _b2.values) || [];
        for (let i2 = 0; i2 < xs.length; i2++) {
          result.customEnvelopeWarp.meshPoints.push({ x: xs[i2], y: ys[i2] });
        }
        if (envelopeWarp.quiltSliceX || envelopeWarp.quiltSliceY) {
          result.customEnvelopeWarp.quiltSliceX = ((_d = (_c = envelopeWarp.quiltSliceX) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.values) || [];
          result.customEnvelopeWarp.quiltSliceY = ((_f = (_e = envelopeWarp.quiltSliceY) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.values) || [];
        }
      }
      return result;
    }
    function isQuiltWarp(warp) {
      var _a2, _b2;
      return warp.deformNumCols != null || warp.deformNumRows != null || ((_a2 = warp.customEnvelopeWarp) === null || _a2 === void 0 ? void 0 : _a2.quiltSliceX) || ((_b2 = warp.customEnvelopeWarp) === null || _b2 === void 0 ? void 0 : _b2.quiltSliceY);
    }
    function encodeWarp(warp) {
      const bounds = warp.bounds;
      const desc = Object.assign(Object.assign({ warpStyle: descriptor_1.warpStyle.encode(warp.style) }, warp.values ? { warpValues: warp.values } : { warpValue: warp.value || 0 }), { warpPerspective: warp.perspective || 0, warpPerspectiveOther: warp.perspectiveOther || 0, warpRotate: descriptor_1.Ornt.encode(warp.rotate), bounds: (
        /*1 ? { // testing
            _classID: 'classFloatRect',
            'Top ': bounds && bounds.top && bounds.top.value || 0,
            Left: bounds && bounds.left && bounds.left.value || 0,
            Btom: bounds && bounds.bottom && bounds.bottom.value || 0,
            Rght: bounds && bounds.right && bounds.right.value || 0,
        } :*/
        {
          "Top ": (0, descriptor_1.unitsValue)(bounds && bounds.top || { units: "Pixels", value: 0 }, "bounds.top"),
          Left: (0, descriptor_1.unitsValue)(bounds && bounds.left || { units: "Pixels", value: 0 }, "bounds.left"),
          Btom: (0, descriptor_1.unitsValue)(bounds && bounds.bottom || { units: "Pixels", value: 0 }, "bounds.bottom"),
          Rght: (0, descriptor_1.unitsValue)(bounds && bounds.right || { units: "Pixels", value: 0 }, "bounds.right")
        }
      ), uOrder: warp.uOrder || 0, vOrder: warp.vOrder || 0 });
      const isQuilt = isQuiltWarp(warp);
      if (isQuilt) {
        const desc2 = desc;
        desc2.deformNumRows = warp.deformNumRows || 0;
        desc2.deformNumCols = warp.deformNumCols || 0;
      }
      const customEnvelopeWarp = warp.customEnvelopeWarp;
      if (customEnvelopeWarp) {
        const meshPoints = customEnvelopeWarp.meshPoints || [];
        if (isQuilt) {
          const desc2 = desc;
          desc2.customEnvelopeWarp = {
            _name: "",
            _classID: "customEnvelopeWarp",
            quiltSliceX: [{
              type: "quiltSliceX",
              values: customEnvelopeWarp.quiltSliceX || []
            }],
            quiltSliceY: [{
              type: "quiltSliceY",
              values: customEnvelopeWarp.quiltSliceY || []
            }],
            meshPoints: [
              { type: "Hrzn", values: meshPoints.map((p) => p.x) },
              { type: "Vrtc", values: meshPoints.map((p) => p.y) }
            ]
          };
        } else {
          desc.customEnvelopeWarp = {
            _name: "",
            _classID: "customEnvelopeWarp",
            meshPoints: [
              { type: "Hrzn", values: meshPoints.map((p) => p.x) },
              { type: "Vrtc", values: meshPoints.map((p) => p.y) }
            ]
          };
        }
      }
      return desc;
    }
    addHandler("PlLd", hasKey("placedLayer"), (reader, target, left) => {
      if ((0, psdReader_1.readSignature)(reader) !== "plcL")
        throw new Error(`Invalid PlLd signature`);
      if ((0, psdReader_1.readInt32)(reader) !== 3)
        throw new Error(`Invalid PlLd version`);
      const id = (0, psdReader_1.readPascalString)(reader, 1);
      const pageNumber = (0, psdReader_1.readInt32)(reader);
      const totalPages = (0, psdReader_1.readInt32)(reader);
      (0, psdReader_1.readInt32)(reader);
      const placedLayerType = (0, psdReader_1.readInt32)(reader);
      if (!placedLayerTypes[placedLayerType])
        throw new Error("Invalid PlLd type");
      const transform = [];
      for (let i2 = 0; i2 < 8; i2++)
        transform.push((0, psdReader_1.readFloat64)(reader));
      const warpVersion = (0, psdReader_1.readInt32)(reader);
      if (warpVersion !== 0)
        throw new Error(`Invalid Warp version ${warpVersion}`);
      const warp = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.placedLayer = target.placedLayer || {
        id,
        type: placedLayerTypes[placedLayerType],
        pageNumber,
        totalPages,
        transform,
        warp: parseWarp(warp)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const placed = target.placedLayer;
      (0, psdWriter_1.writeSignature)(writer, "plcL");
      (0, psdWriter_1.writeInt32)(writer, 3);
      if (!placed.id || typeof placed.id !== "string" || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(placed.id)) {
        throw new Error("Placed layer ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)");
      }
      (0, psdWriter_1.writePascalString)(writer, placed.id, 1);
      (0, psdWriter_1.writeInt32)(writer, placed.pageNumber || 1);
      (0, psdWriter_1.writeInt32)(writer, placed.totalPages || 1);
      (0, psdWriter_1.writeInt32)(writer, 16);
      if (placedLayerTypes.indexOf(placed.type) === -1)
        throw new Error("Invalid placedLayer type");
      (0, psdWriter_1.writeInt32)(writer, placedLayerTypes.indexOf(placed.type));
      for (let i2 = 0; i2 < 8; i2++)
        (0, psdWriter_1.writeFloat64)(writer, placed.transform[i2]);
      (0, psdWriter_1.writeInt32)(writer, 0);
      const warp = getWarpFromPlacedLayer(placed);
      const isQuilt = isQuiltWarp(warp);
      const type = isQuilt ? "quiltWarp" : "warp";
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", type, encodeWarp(warp), type);
    });
    function uint8ToFloat32(array) {
      return new Float32Array(array.buffer.slice(array.byteOffset), 0, array.byteLength / 4);
    }
    function uint8ToUint32(array) {
      return new Uint32Array(array.buffer.slice(array.byteOffset), 0, array.byteLength / 4);
    }
    function toUint8(array) {
      return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    }
    function arrayToPoints(array) {
      const points = [];
      for (let i2 = 0; i2 < array.length; i2 += 2) {
        points.push({ x: array[i2], y: array[i2 + 1] });
      }
      return points;
    }
    function pointsToArray(points) {
      const array = [];
      for (let i2 = 0; i2 < points.length; i2++) {
        array.push(points[i2].x, points[i2].y);
      }
      return array;
    }
    function uint8ToPoints(array) {
      return arrayToPoints(uint8ToFloat32(array));
    }
    function hrznVrtcToPoint(desc) {
      return {
        x: (0, descriptor_1.parseUnits)(desc.Hrzn),
        y: (0, descriptor_1.parseUnits)(desc.Vrtc)
      };
    }
    function pointToHrznVrtc(point) {
      return {
        _name: "",
        _classID: "Pnt ",
        Hrzn: (0, descriptor_1.unitsValue)(point.x, "x"),
        Vrtc: (0, descriptor_1.unitsValue)(point.y, "y")
      };
    }
    function parseFilterFXItem(f, options) {
      const base = {
        name: f["Nm  "],
        opacity: (0, descriptor_1.parsePercent)(f.blendOptions.Opct),
        blendMode: descriptor_1.BlnM.decode(f.blendOptions["Md  "]),
        enabled: f.enab,
        hasOptions: f.hasoptions,
        foregroundColor: (0, descriptor_1.parseColor)(f.FrgC),
        backgroundColor: (0, descriptor_1.parseColor)(f.BckC)
      };
      if ("Fltr" in f) {
        switch (f.Fltr._classID) {
          case "boxblur":
            return Object.assign(Object.assign({}, base), { type: "box blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "GsnB":
            return Object.assign(Object.assign({}, base), { type: "gaussian blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "MtnB":
            return Object.assign(Object.assign({}, base), { type: "motion blur", filter: {
              angle: f.Fltr.Angl,
              distance: (0, descriptor_1.parseUnits)(f.Fltr.Dstn)
            } });
          case "RdlB":
            return Object.assign(Object.assign({}, base), { type: "radial blur", filter: {
              amount: f.Fltr.Amnt,
              method: descriptor_1.BlrM.decode(f.Fltr.BlrM),
              quality: descriptor_1.BlrQ.decode(f.Fltr.BlrQ)
            } });
          case "shapeBlur":
            return Object.assign(Object.assign({}, base), { type: "shape blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              customShape: { name: f.Fltr.customShape["Nm  "], id: f.Fltr.customShape.Idnt }
            } });
          case "SmrB":
            return Object.assign(Object.assign({}, base), { type: "smart blur", filter: {
              radius: f.Fltr["Rds "],
              threshold: f.Fltr.Thsh,
              quality: descriptor_1.SmBQ.decode(f.Fltr.SmBQ),
              mode: descriptor_1.SmBM.decode(f.Fltr.SmBM)
            } });
          case "surfaceBlur":
            return Object.assign(Object.assign({}, base), { type: "surface blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              threshold: f.Fltr.Thsh
            } });
          case "Dspl":
            return Object.assign(Object.assign({}, base), { type: "displace", filter: {
              horizontalScale: f.Fltr.HrzS,
              verticalScale: f.Fltr.VrtS,
              displacementMap: descriptor_1.DspM.decode(f.Fltr.DspM),
              undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA),
              displacementFile: {
                signature: f.Fltr.DspF.sig,
                path: f.Fltr.DspF.path
                // TODO: this is decoded incorrectly ???
              }
            } });
          case "Pnch":
            return Object.assign(Object.assign({}, base), { type: "pinch", filter: {
              amount: f.Fltr.Amnt
            } });
          case "Plr ":
            return Object.assign(Object.assign({}, base), { type: "polar coordinates", filter: {
              conversion: descriptor_1.Cnvr.decode(f.Fltr.Cnvr)
            } });
          case "Rple":
            return Object.assign(Object.assign({}, base), { type: "ripple", filter: {
              amount: f.Fltr.Amnt,
              size: descriptor_1.RplS.decode(f.Fltr.RplS)
            } });
          case "Shr ":
            return Object.assign(Object.assign({}, base), { type: "shear", filter: {
              shearPoints: f.Fltr.ShrP.map((p) => ({ x: p.Hrzn, y: p.Vrtc })),
              shearStart: f.Fltr.ShrS,
              shearEnd: f.Fltr.ShrE,
              undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA)
            } });
          case "Sphr":
            return Object.assign(Object.assign({}, base), { type: "spherize", filter: {
              amount: f.Fltr.Amnt,
              mode: descriptor_1.SphM.decode(f.Fltr.SphM)
            } });
          case "Twrl":
            return Object.assign(Object.assign({}, base), { type: "twirl", filter: {
              angle: f.Fltr.Angl
            } });
          case "Wave":
            return Object.assign(Object.assign({}, base), { type: "wave", filter: {
              numberOfGenerators: f.Fltr.NmbG,
              type: descriptor_1.Wvtp.decode(f.Fltr.Wvtp),
              wavelength: { min: f.Fltr.WLMn, max: f.Fltr.WLMx },
              amplitude: { min: f.Fltr.AmMn, max: f.Fltr.AmMx },
              scale: { x: f.Fltr.SclH, y: f.Fltr.SclV },
              randomSeed: f.Fltr.RndS,
              undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA)
            } });
          case "ZgZg":
            return Object.assign(Object.assign({}, base), { type: "zigzag", filter: {
              amount: f.Fltr.Amnt,
              ridges: f.Fltr.NmbR,
              style: descriptor_1.ZZTy.decode(f.Fltr.ZZTy)
            } });
          case "AdNs":
            return Object.assign(Object.assign({}, base), { type: "add noise", filter: {
              amount: (0, descriptor_1.parsePercent)(f.Fltr.Nose),
              distribution: descriptor_1.Dstr.decode(f.Fltr.Dstr),
              monochromatic: f.Fltr.Mnch,
              randomSeed: f.Fltr.FlRs
            } });
          case "DstS":
            return Object.assign(Object.assign({}, base), { type: "dust and scratches", filter: {
              radius: f.Fltr["Rds "],
              threshold: f.Fltr.Thsh
            } });
          case "Mdn ":
            return Object.assign(Object.assign({}, base), { type: "median", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "denoise":
            return Object.assign(Object.assign({}, base), { type: "reduce noise", filter: {
              preset: f.Fltr.preset,
              removeJpegArtifact: f.Fltr.removeJPEGArtifact,
              reduceColorNoise: (0, descriptor_1.parsePercent)(f.Fltr.ClNs),
              sharpenDetails: (0, descriptor_1.parsePercent)(f.Fltr.Shrp),
              channelDenoise: f.Fltr.channelDenoise.map((c) => Object.assign({ channels: c.Chnl.map(descriptor_1.Chnl.decode), amount: c.Amnt }, c.EdgF ? { preserveDetails: c.EdgF } : {}))
            } });
          case "ClrH":
            return Object.assign(Object.assign({}, base), { type: "color halftone", filter: {
              radius: f.Fltr["Rds "],
              angle1: f.Fltr.Ang1,
              angle2: f.Fltr.Ang2,
              angle3: f.Fltr.Ang3,
              angle4: f.Fltr.Ang4
            } });
          case "Crst":
            return Object.assign(Object.assign({}, base), { type: "crystallize", filter: {
              cellSize: f.Fltr.ClSz,
              randomSeed: f.Fltr.FlRs
            } });
          case "Mztn":
            return Object.assign(Object.assign({}, base), { type: "mezzotint", filter: {
              type: descriptor_1.MztT.decode(f.Fltr.MztT),
              randomSeed: f.Fltr.FlRs
            } });
          case "Msc ":
            return Object.assign(Object.assign({}, base), { type: "mosaic", filter: {
              cellSize: (0, descriptor_1.parseUnits)(f.Fltr.ClSz)
            } });
          case "Pntl":
            return Object.assign(Object.assign({}, base), { type: "pointillize", filter: {
              cellSize: f.Fltr.ClSz,
              randomSeed: f.Fltr.FlRs
            } });
          case "Clds":
            return Object.assign(Object.assign({}, base), { type: "clouds", filter: {
              randomSeed: f.Fltr.FlRs
            } });
          case "DfrC":
            return Object.assign(Object.assign({}, base), { type: "difference clouds", filter: {
              randomSeed: f.Fltr.FlRs
            } });
          case "Fbrs":
            return Object.assign(Object.assign({}, base), { type: "fibers", filter: {
              variance: f.Fltr.Vrnc,
              strength: f.Fltr.Strg,
              randomSeed: f.Fltr.RndS
            } });
          case "LnsF":
            return Object.assign(Object.assign({}, base), { type: "lens flare", filter: {
              brightness: f.Fltr.Brgh,
              position: { x: f.Fltr.FlrC.Hrzn, y: f.Fltr.FlrC.Vrtc },
              lensType: descriptor_1.Lns.decode(f.Fltr["Lns "])
            } });
          case "smartSharpen":
            return Object.assign(Object.assign({}, base), { type: "smart sharpen", filter: {
              amount: (0, descriptor_1.parsePercent)(f.Fltr.Amnt),
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              threshold: f.Fltr.Thsh,
              angle: f.Fltr.Angl,
              moreAccurate: f.Fltr.moreAccurate,
              blur: descriptor_1.blurType.decode(f.Fltr.blur),
              preset: f.Fltr.preset,
              shadow: {
                fadeAmount: (0, descriptor_1.parsePercent)(f.Fltr.sdwM.Amnt),
                tonalWidth: (0, descriptor_1.parsePercent)(f.Fltr.sdwM.Wdth),
                radius: f.Fltr.sdwM["Rds "]
              },
              highlight: {
                fadeAmount: (0, descriptor_1.parsePercent)(f.Fltr.hglM.Amnt),
                tonalWidth: (0, descriptor_1.parsePercent)(f.Fltr.hglM.Wdth),
                radius: f.Fltr.hglM["Rds "]
              }
            } });
          case "UnsM":
            return Object.assign(Object.assign({}, base), { type: "unsharp mask", filter: {
              amount: (0, descriptor_1.parsePercent)(f.Fltr.Amnt),
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              threshold: f.Fltr.Thsh
            } });
          case "Dfs ":
            return Object.assign(Object.assign({}, base), { type: "diffuse", filter: {
              mode: descriptor_1.DfsM.decode(f.Fltr["Md  "]),
              randomSeed: f.Fltr.FlRs
            } });
          case "Embs":
            return Object.assign(Object.assign({}, base), { type: "emboss", filter: {
              angle: f.Fltr.Angl,
              height: f.Fltr.Hght,
              amount: f.Fltr.Amnt
            } });
          case "Extr":
            return Object.assign(Object.assign({}, base), { type: "extrude", filter: {
              type: descriptor_1.ExtT.decode(f.Fltr.ExtT),
              size: f.Fltr.ExtS,
              depth: f.Fltr.ExtD,
              depthMode: descriptor_1.ExtR.decode(f.Fltr.ExtR),
              randomSeed: f.Fltr.FlRs,
              solidFrontFaces: f.Fltr.ExtF,
              maskIncompleteBlocks: f.Fltr.ExtM
            } });
          case "Tls ":
            return Object.assign(Object.assign({}, base), { type: "tiles", filter: {
              numberOfTiles: f.Fltr.TlNm,
              maximumOffset: f.Fltr.TlOf,
              fillEmptyAreaWith: descriptor_1.FlCl.decode(f.Fltr.FlCl),
              randomSeed: f.Fltr.FlRs
            } });
          case "TrcC":
            return Object.assign(Object.assign({}, base), { type: "trace contour", filter: {
              level: f.Fltr["Lvl "],
              edge: descriptor_1.CntE.decode(f.Fltr["Edg "])
            } });
          case "Wnd ":
            return Object.assign(Object.assign({}, base), { type: "wind", filter: {
              method: descriptor_1.WndM.decode(f.Fltr.WndM),
              direction: descriptor_1.Drct.decode(f.Fltr.Drct)
            } });
          case "Dntr":
            return Object.assign(Object.assign({}, base), { type: "de-interlace", filter: {
              eliminate: descriptor_1.IntE.decode(f.Fltr.IntE),
              newFieldsBy: descriptor_1.IntC.decode(f.Fltr.IntC)
            } });
          case "Cstm":
            return Object.assign(Object.assign({}, base), { type: "custom", filter: {
              scale: f.Fltr["Scl "],
              offset: f.Fltr.Ofst,
              matrix: f.Fltr.Mtrx
            } });
          case "HghP":
            return Object.assign(Object.assign({}, base), { type: "high pass", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "Mxm ":
            return Object.assign(Object.assign({}, base), { type: "maximum", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "Mnm ":
            return Object.assign(Object.assign({}, base), { type: "minimum", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "Ofst":
            return Object.assign(Object.assign({}, base), { type: "offset", filter: {
              horizontal: f.Fltr.Hrzn,
              vertical: f.Fltr.Vrtc,
              undefinedAreas: descriptor_1.FlMd.decode(f.Fltr["Fl  "])
            } });
          case "rigidTransform":
            return Object.assign(Object.assign({}, base), { type: "puppet", filter: {
              rigidType: f.Fltr.rigidType,
              bounds: [
                { x: f.Fltr.PuX0, y: f.Fltr.PuY0 },
                { x: f.Fltr.PuX1, y: f.Fltr.PuY1 },
                { x: f.Fltr.PuX2, y: f.Fltr.PuY2 },
                { x: f.Fltr.PuX3, y: f.Fltr.PuY3 }
              ],
              puppetShapeList: f.Fltr.puppetShapeList.map((p) => ({
                rigidType: p.rigidType,
                // TODO: VrsM
                // TODO: VrsN
                originalVertexArray: uint8ToPoints(p.originalVertexArray),
                deformedVertexArray: uint8ToPoints(p.deformedVertexArray),
                indexArray: Array.from(uint8ToUint32(p.indexArray)),
                pinOffsets: arrayToPoints(p.pinOffsets),
                posFinalPins: arrayToPoints(p.posFinalPins),
                pinVertexIndices: p.pinVertexIndices,
                selectedPin: p.selectedPin,
                pinPosition: arrayToPoints(p.PinP),
                pinRotation: p.PnRt,
                pinOverlay: p.PnOv,
                pinDepth: p.PnDp,
                meshQuality: p.meshQuality,
                meshExpansion: p.meshExpansion,
                meshRigidity: p.meshRigidity,
                imageResolution: p.imageResolution,
                meshBoundaryPath: {
                  pathComponents: p.meshBoundaryPath.pathComponents.map((c) => ({
                    shapeOperation: c.shapeOperation.split(".")[1],
                    paths: c.SbpL.map((t) => ({
                      closed: t.Clsp,
                      points: t["Pts "].map((pt) => ({
                        anchor: hrznVrtcToPoint(pt.Anch),
                        forward: hrznVrtcToPoint(pt["Fwd "]),
                        backward: hrznVrtcToPoint(pt["Bwd "]),
                        smooth: pt.Smoo
                      }))
                    }))
                  }))
                }
              }))
            } });
          case "PbPl": {
            const parameters = [];
            const Flrt = f.Fltr;
            for (let i2 = 0; i2 < fromAtoZ.length; i2++) {
              if (!Flrt[`PN${fromAtoZ[i2]}a`])
                break;
              for (let j = 0; j < fromAtoZ.length; j++) {
                if (!Flrt[`PN${fromAtoZ[i2]}${fromAtoZ[j]}`])
                  break;
                parameters.push({
                  name: Flrt[`PN${fromAtoZ[i2]}${fromAtoZ[j]}`],
                  value: Flrt[`PF${fromAtoZ[i2]}${fromAtoZ[j]}`]
                });
              }
            }
            return Object.assign(Object.assign({}, base), { type: "oil paint plugin", filter: {
              name: f.Fltr.KnNm,
              gpu: f.Fltr.GpuY,
              lighting: f.Fltr.LIWy,
              parameters
            } });
          }
          // case 2089: return {
          // 	...base,
          // 	type: 'adaptive wide angle',
          // 	params: {
          // 		correction: prjM.decode(f.Fltr.prjM),
          // 		focalLength: f.Fltr.focL,
          // 		cropFactor: f.Fltr.CrpF,
          // 		imageScale: f.Fltr.imgS,
          // 		imageX: f.Fltr.imgX,
          // 		imageY: f.Fltr.imgY,
          // 	},
          // };
          case "HsbP":
            return Object.assign(Object.assign({}, base), { type: "hsb/hsl", filter: {
              inputMode: descriptor_1.ClrS.decode(f.Fltr.Inpt),
              rowOrder: descriptor_1.ClrS.decode(f.Fltr.Otpt)
            } });
          case "oilPaint":
            return Object.assign(Object.assign({}, base), { type: "oil paint", filter: {
              lightingOn: f.Fltr.lightingOn,
              stylization: f.Fltr.stylization,
              cleanliness: f.Fltr.cleanliness,
              brushScale: f.Fltr.brushScale,
              microBrush: f.Fltr.microBrush,
              lightDirection: f.Fltr.LghD,
              specularity: f.Fltr.specularity
            } });
          case "LqFy":
            {
              return Object.assign(Object.assign({}, base), { type: "liquify", filter: {
                liquifyMesh: f.Fltr.LqMe
              } });
            }
            ;
          case "perspectiveWarpTransform":
            {
              return Object.assign(Object.assign({}, base), { type: "perspective warp", filter: {
                vertices: f.Fltr.vertices.map(hrznVrtcToPoint),
                warpedVertices: f.Fltr.warpedVertices.map(hrznVrtcToPoint),
                quads: f.Fltr.quads.map((q) => q.indices)
              } });
            }
            ;
          case "Crvs":
            {
              return Object.assign(Object.assign({}, base), { type: "curves", filter: Object.assign({ presetKind: descriptor_1.presetKindType.decode(f.Fltr.presetKind) }, f.Fltr.Adjs ? {
                adjustments: f.Fltr.Adjs.map((a) => {
                  const channels = a.Chnl.map(descriptor_1.Chnl.decode);
                  if (a["Crv "]) {
                    return {
                      channels,
                      curve: a["Crv "].map((c) => {
                        const point = { x: c.Hrzn, y: c.Vrtc };
                        if (c.Cnty)
                          point.curved = true;
                        return point;
                      })
                    };
                  } else if (a.Mpng) {
                    return { channels, values: a.Mpng };
                  } else {
                    throw new Error(`Unknown curve adjustment`);
                  }
                })
              } : {}) });
            }
            ;
          case "BrgC":
            {
              return Object.assign(Object.assign({}, base), { type: "brightness/contrast", filter: {
                brightness: f.Fltr.Brgh,
                contrast: f.Fltr.Cntr,
                useLegacy: !!f.Fltr.useLegacy
              } });
            }
            ;
          default:
            if (options.throwForMissingFeatures) {
              throw new Error(`Unknown filter classId: ${f.Fltr._classID}`);
            }
            return void 0;
        }
      } else {
        switch (f.filterID) {
          case 1098281575:
            return Object.assign(Object.assign({}, base), { type: "average" });
          case 1114403360:
            return Object.assign(Object.assign({}, base), { type: "blur" });
          case 1114403405:
            return Object.assign(Object.assign({}, base), { type: "blur more" });
          case 1148416099:
            return Object.assign(Object.assign({}, base), { type: "despeckle" });
          case 1180922912:
            return Object.assign(Object.assign({}, base), { type: "facet" });
          case 1181902701:
            return Object.assign(Object.assign({}, base), { type: "fragment" });
          case 1399353968:
            return Object.assign(Object.assign({}, base), { type: "sharpen" });
          case 1399353925:
            return Object.assign(Object.assign({}, base), { type: "sharpen edges" });
          case 1399353933:
            return Object.assign(Object.assign({}, base), { type: "sharpen more" });
          case 1181639749:
            return Object.assign(Object.assign({}, base), { type: "find edges" });
          case 1399616122:
            return Object.assign(Object.assign({}, base), { type: "solarize" });
          case 1314149187:
            return Object.assign(Object.assign({}, base), { type: "ntsc colors" });
          case 1231976050:
            return Object.assign(Object.assign({}, base), { type: "invert" });
          default:
            if (options.throwForMissingFeatures) {
              throw new Error(`Unknown filterID: ${f.filterID}`);
            }
        }
      }
    }
    function parseFilterFX(desc, options) {
      return {
        enabled: desc.enab,
        validAtPosition: desc.validAtPosition,
        maskEnabled: desc.filterMaskEnable,
        maskLinked: desc.filterMaskLinked,
        maskExtendWithWhite: desc.filterMaskExtendWithWhite,
        list: desc.filterFXList.map((x2) => parseFilterFXItem(x2, options)).filter((x2) => !!x2)
      };
    }
    function uvRadius(t) {
      return (0, descriptor_1.unitsValue)(t.radius, "radius");
    }
    function serializeFilterFXItem(f) {
      const base = {
        _name: "",
        _classID: "filterFX",
        "Nm  ": f.name,
        blendOptions: {
          _name: "",
          _classID: "blendOptions",
          Opct: (0, descriptor_1.unitsPercentF)(f.opacity),
          "Md  ": descriptor_1.BlnM.encode(f.blendMode)
        },
        enab: f.enabled,
        hasoptions: f.hasOptions,
        FrgC: (0, descriptor_1.serializeColor)(f.foregroundColor),
        BckC: (0, descriptor_1.serializeColor)(f.backgroundColor)
      };
      switch (f.type) {
        case "average":
          return Object.assign(Object.assign({}, base), { filterID: 1098281575 });
        case "blur":
          return Object.assign(Object.assign({}, base), { filterID: 1114403360 });
        case "blur more":
          return Object.assign(Object.assign({}, base), { filterID: 1114403405 });
        case "box blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Box Blur",
            _classID: "boxblur",
            "Rds ": uvRadius(f.filter)
          }, filterID: 697 });
        case "gaussian blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            // _name: '高斯模糊', // Testing
            _name: "Gaussian Blur",
            _classID: "GsnB",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1198747202 });
        case "motion blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Motion Blur",
            _classID: "MtnB",
            Angl: f.filter.angle,
            Dstn: (0, descriptor_1.unitsValue)(f.filter.distance, "distance")
          }, filterID: 1299476034 });
        case "radial blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Radial Blur",
            _classID: "RdlB",
            Amnt: f.filter.amount,
            BlrM: descriptor_1.BlrM.encode(f.filter.method),
            BlrQ: descriptor_1.BlrQ.encode(f.filter.quality)
          }, filterID: 1382313026 });
        case "shape blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Shape Blur",
            _classID: "shapeBlur",
            "Rds ": uvRadius(f.filter),
            customShape: {
              _name: "",
              _classID: "customShape",
              "Nm  ": f.filter.customShape.name,
              Idnt: f.filter.customShape.id
            }
          }, filterID: 702 });
        case "smart blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Smart Blur",
            _classID: "SmrB",
            "Rds ": f.filter.radius,
            Thsh: f.filter.threshold,
            SmBQ: descriptor_1.SmBQ.encode(f.filter.quality),
            SmBM: descriptor_1.SmBM.encode(f.filter.mode)
          }, filterID: 1399681602 });
        case "surface blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Surface Blur",
            _classID: "surfaceBlur",
            "Rds ": uvRadius(f.filter),
            Thsh: f.filter.threshold
          }, filterID: 701 });
        case "displace":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Displace",
            _classID: "Dspl",
            HrzS: f.filter.horizontalScale,
            VrtS: f.filter.verticalScale,
            DspM: descriptor_1.DspM.encode(f.filter.displacementMap),
            UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
            DspF: {
              sig: f.filter.displacementFile.signature,
              path: f.filter.displacementFile.path
            }
          }, filterID: 1148416108 });
        case "pinch":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Pinch",
            _classID: "Pnch",
            Amnt: f.filter.amount
          }, filterID: 1349411688 });
        case "polar coordinates":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Polar Coordinates",
            _classID: "Plr ",
            Cnvr: descriptor_1.Cnvr.encode(f.filter.conversion)
          }, filterID: 1349284384 });
        case "ripple":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Ripple",
            _classID: "Rple",
            Amnt: f.filter.amount,
            RplS: descriptor_1.RplS.encode(f.filter.size)
          }, filterID: 1383099493 });
        case "shear":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Shear",
            _classID: "Shr ",
            ShrP: f.filter.shearPoints.map((p) => ({ _name: "", _classID: "Pnt ", Hrzn: p.x, Vrtc: p.y })),
            UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
            ShrS: f.filter.shearStart,
            ShrE: f.filter.shearEnd
          }, filterID: 1399353888 });
        case "spherize":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Spherize",
            _classID: "Sphr",
            Amnt: f.filter.amount,
            SphM: descriptor_1.SphM.encode(f.filter.mode)
          }, filterID: 1399875698 });
        case "twirl":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Twirl",
            _classID: "Twrl",
            Angl: f.filter.angle
          }, filterID: 1417114220 });
        case "wave":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Wave",
            _classID: "Wave",
            Wvtp: descriptor_1.Wvtp.encode(f.filter.type),
            NmbG: f.filter.numberOfGenerators,
            WLMn: f.filter.wavelength.min,
            WLMx: f.filter.wavelength.max,
            AmMn: f.filter.amplitude.min,
            AmMx: f.filter.amplitude.max,
            SclH: f.filter.scale.x,
            SclV: f.filter.scale.y,
            UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
            RndS: f.filter.randomSeed
          }, filterID: 1466005093 });
        case "zigzag":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "ZigZag",
            _classID: "ZgZg",
            Amnt: f.filter.amount,
            NmbR: f.filter.ridges,
            ZZTy: descriptor_1.ZZTy.encode(f.filter.style)
          }, filterID: 1516722791 });
        case "add noise":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Add Noise",
            _classID: "AdNs",
            Dstr: descriptor_1.Dstr.encode(f.filter.distribution),
            Nose: (0, descriptor_1.unitsPercentF)(f.filter.amount),
            Mnch: f.filter.monochromatic,
            FlRs: f.filter.randomSeed
          }, filterID: 1097092723 });
        case "despeckle":
          return Object.assign(Object.assign({}, base), { filterID: 1148416099 });
        case "dust and scratches":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Dust & Scratches",
            _classID: "DstS",
            "Rds ": f.filter.radius,
            Thsh: f.filter.threshold
          }, filterID: 1148417107 });
        case "median":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Median",
            _classID: "Mdn ",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1298427424 });
        case "reduce noise":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Reduce Noise",
            _classID: "denoise",
            ClNs: (0, descriptor_1.unitsPercentF)(f.filter.reduceColorNoise),
            Shrp: (0, descriptor_1.unitsPercentF)(f.filter.sharpenDetails),
            removeJPEGArtifact: f.filter.removeJpegArtifact,
            channelDenoise: f.filter.channelDenoise.map((c) => Object.assign({ _name: "", _classID: "channelDenoiseParams", Chnl: c.channels.map((i2) => descriptor_1.Chnl.encode(i2)), Amnt: c.amount }, c.preserveDetails ? { EdgF: c.preserveDetails } : {})),
            preset: f.filter.preset
          }, filterID: 633 });
        case "color halftone":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Color Halftone",
            _classID: "ClrH",
            "Rds ": f.filter.radius,
            Ang1: f.filter.angle1,
            Ang2: f.filter.angle2,
            Ang3: f.filter.angle3,
            Ang4: f.filter.angle4
          }, filterID: 1131180616 });
        case "crystallize":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Crystallize",
            _classID: "Crst",
            ClSz: f.filter.cellSize,
            FlRs: f.filter.randomSeed
          }, filterID: 1131574132 });
        case "facet":
          return Object.assign(Object.assign({}, base), { filterID: 1180922912 });
        case "fragment":
          return Object.assign(Object.assign({}, base), { filterID: 1181902701 });
        case "mezzotint":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Mezzotint",
            _classID: "Mztn",
            MztT: descriptor_1.MztT.encode(f.filter.type),
            FlRs: f.filter.randomSeed
          }, filterID: 1299870830 });
        case "mosaic":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Mosaic",
            _classID: "Msc ",
            ClSz: (0, descriptor_1.unitsValue)(f.filter.cellSize, "cellSize")
          }, filterID: 1299407648 });
        case "pointillize":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Pointillize",
            _classID: "Pntl",
            ClSz: f.filter.cellSize,
            FlRs: f.filter.randomSeed
          }, filterID: 1349416044 });
        case "clouds":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Clouds",
            _classID: "Clds",
            FlRs: f.filter.randomSeed
          }, filterID: 1131177075 });
        case "difference clouds":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Difference Clouds",
            _classID: "DfrC",
            FlRs: f.filter.randomSeed
          }, filterID: 1147564611 });
        case "fibers":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Fibers",
            _classID: "Fbrs",
            Vrnc: f.filter.variance,
            Strg: f.filter.strength,
            RndS: f.filter.randomSeed
          }, filterID: 1180856947 });
        case "lens flare":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Lens Flare",
            _classID: "LnsF",
            Brgh: f.filter.brightness,
            FlrC: {
              _name: "",
              _classID: "Pnt ",
              Hrzn: f.filter.position.x,
              Vrtc: f.filter.position.y
            },
            "Lns ": descriptor_1.Lns.encode(f.filter.lensType)
          }, filterID: 1282306886 });
        case "sharpen":
          return Object.assign(Object.assign({}, base), { filterID: 1399353968 });
        case "sharpen edges":
          return Object.assign(Object.assign({}, base), { filterID: 1399353925 });
        case "sharpen more":
          return Object.assign(Object.assign({}, base), { filterID: 1399353933 });
        case "smart sharpen":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Smart Sharpen",
            _classID: "smartSharpen",
            Amnt: (0, descriptor_1.unitsPercentF)(f.filter.amount),
            "Rds ": uvRadius(f.filter),
            Thsh: f.filter.threshold,
            Angl: f.filter.angle,
            moreAccurate: f.filter.moreAccurate,
            blur: descriptor_1.blurType.encode(f.filter.blur),
            preset: f.filter.preset,
            sdwM: {
              _name: "Parameters",
              _classID: "adaptCorrectTones",
              Amnt: (0, descriptor_1.unitsPercentF)(f.filter.shadow.fadeAmount),
              Wdth: (0, descriptor_1.unitsPercentF)(f.filter.shadow.tonalWidth),
              "Rds ": f.filter.shadow.radius
            },
            hglM: {
              _name: "Parameters",
              _classID: "adaptCorrectTones",
              Amnt: (0, descriptor_1.unitsPercentF)(f.filter.highlight.fadeAmount),
              Wdth: (0, descriptor_1.unitsPercentF)(f.filter.highlight.tonalWidth),
              "Rds ": f.filter.highlight.radius
            }
          }, filterID: 698 });
        case "unsharp mask":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Unsharp Mask",
            _classID: "UnsM",
            Amnt: (0, descriptor_1.unitsPercentF)(f.filter.amount),
            "Rds ": uvRadius(f.filter),
            Thsh: f.filter.threshold
          }, filterID: 1433301837 });
        case "diffuse":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Diffuse",
            _classID: "Dfs ",
            "Md  ": descriptor_1.DfsM.encode(f.filter.mode),
            FlRs: f.filter.randomSeed
          }, filterID: 1147564832 });
        case "emboss":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Emboss",
            _classID: "Embs",
            Angl: f.filter.angle,
            Hght: f.filter.height,
            Amnt: f.filter.amount
          }, filterID: 1164796531 });
        case "extrude":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Extrude",
            _classID: "Extr",
            ExtS: f.filter.size,
            ExtD: f.filter.depth,
            ExtF: f.filter.solidFrontFaces,
            ExtM: f.filter.maskIncompleteBlocks,
            ExtT: descriptor_1.ExtT.encode(f.filter.type),
            ExtR: descriptor_1.ExtR.encode(f.filter.depthMode),
            FlRs: f.filter.randomSeed
          }, filterID: 1165522034 });
        case "find edges":
          return Object.assign(Object.assign({}, base), { filterID: 1181639749 });
        case "solarize":
          return Object.assign(Object.assign({}, base), { filterID: 1399616122 });
        case "tiles":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Tiles",
            _classID: "Tls ",
            TlNm: f.filter.numberOfTiles,
            TlOf: f.filter.maximumOffset,
            FlCl: descriptor_1.FlCl.encode(f.filter.fillEmptyAreaWith),
            FlRs: f.filter.randomSeed
          }, filterID: 1416393504 });
        case "trace contour":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Trace Contour",
            _classID: "TrcC",
            "Lvl ": f.filter.level,
            "Edg ": descriptor_1.CntE.encode(f.filter.edge)
          }, filterID: 1416782659 });
        case "wind":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Wind",
            _classID: "Wnd ",
            WndM: descriptor_1.WndM.encode(f.filter.method),
            Drct: descriptor_1.Drct.encode(f.filter.direction)
          }, filterID: 1466852384 });
        case "de-interlace":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "De-Interlace",
            _classID: "Dntr",
            IntE: descriptor_1.IntE.encode(f.filter.eliminate),
            IntC: descriptor_1.IntC.encode(f.filter.newFieldsBy)
          }, filterID: 1148089458 });
        case "ntsc colors":
          return Object.assign(Object.assign({}, base), { filterID: 1314149187 });
        case "invert":
          return Object.assign(Object.assign({}, base), { filterID: 1231976050 });
        case "custom":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Custom",
            _classID: "Cstm",
            "Scl ": f.filter.scale,
            Ofst: f.filter.offset,
            Mtrx: f.filter.matrix
          }, filterID: 1131639917 });
        case "high pass":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "High Pass",
            _classID: "HghP",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1214736464 });
        case "maximum":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Maximum",
            _classID: "Mxm ",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1299737888 });
        case "minimum":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Minimum",
            _classID: "Mnm ",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1299082528 });
        case "offset":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Offset",
            _classID: "Ofst",
            Hrzn: f.filter.horizontal,
            Vrtc: f.filter.vertical,
            "Fl  ": descriptor_1.FlMd.encode(f.filter.undefinedAreas)
          }, filterID: 1332114292 });
        case "puppet":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Rigid Transform",
            _classID: "rigidTransform",
            "null": ["Ordn.Trgt"],
            // TODO: ???
            rigidType: f.filter.rigidType,
            puppetShapeList: f.filter.puppetShapeList.map((p) => ({
              _name: "",
              _classID: "puppetShape",
              rigidType: p.rigidType,
              VrsM: 1,
              // TODO: ???
              VrsN: 0,
              // TODO: ???
              originalVertexArray: toUint8(new Float32Array(pointsToArray(p.originalVertexArray))),
              deformedVertexArray: toUint8(new Float32Array(pointsToArray(p.deformedVertexArray))),
              indexArray: toUint8(new Uint32Array(p.indexArray)),
              pinOffsets: pointsToArray(p.pinOffsets),
              posFinalPins: pointsToArray(p.posFinalPins),
              pinVertexIndices: p.pinVertexIndices,
              PinP: pointsToArray(p.pinPosition),
              PnRt: p.pinRotation,
              PnOv: p.pinOverlay,
              PnDp: p.pinDepth,
              meshQuality: p.meshQuality,
              meshExpansion: p.meshExpansion,
              meshRigidity: p.meshRigidity,
              imageResolution: p.imageResolution,
              meshBoundaryPath: {
                _name: "",
                _classID: "pathClass",
                pathComponents: p.meshBoundaryPath.pathComponents.map((c) => ({
                  _name: "",
                  _classID: "PaCm",
                  shapeOperation: `shapeOperation.${c.shapeOperation}`,
                  SbpL: c.paths.map((path) => ({
                    _name: "",
                    _classID: "Sbpl",
                    Clsp: path.closed,
                    "Pts ": path.points.map((pt) => ({
                      _name: "",
                      _classID: "Pthp",
                      Anch: pointToHrznVrtc(pt.anchor),
                      "Fwd ": pointToHrznVrtc(pt.forward),
                      "Bwd ": pointToHrznVrtc(pt.backward),
                      Smoo: pt.smooth
                    }))
                  }))
                }))
              },
              selectedPin: p.selectedPin
            })),
            PuX0: f.filter.bounds[0].x,
            PuX1: f.filter.bounds[1].x,
            PuX2: f.filter.bounds[2].x,
            PuX3: f.filter.bounds[3].x,
            PuY0: f.filter.bounds[0].y,
            PuY1: f.filter.bounds[1].y,
            PuY2: f.filter.bounds[2].y,
            PuY3: f.filter.bounds[3].y
          }, filterID: 991 });
        case "oil paint plugin": {
          const params = {};
          for (let i2 = 0; i2 < f.filter.parameters.length; i2++) {
            const { name, value } = f.filter.parameters[i2];
            const suffix = `${fromAtoZ[Math.floor(i2 / fromAtoZ.length)]}${fromAtoZ[i2 % fromAtoZ.length]}`;
            params[`PN${suffix}`] = name;
            params[`PT${suffix}`] = 0;
            params[`PF${suffix}`] = value;
          }
          return Object.assign(Object.assign({}, base), { Fltr: Object.assign({ _name: "Oil Paint Plugin", _classID: "PbPl", KnNm: f.filter.name, GpuY: f.filter.gpu, LIWy: f.filter.lighting, FPth: "1" }, params), filterID: 1348620396 });
        }
        case "oil paint":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Oil Paint",
            _classID: "oilPaint",
            lightingOn: f.filter.lightingOn,
            stylization: f.filter.stylization,
            cleanliness: f.filter.cleanliness,
            brushScale: f.filter.brushScale,
            microBrush: f.filter.microBrush,
            LghD: f.filter.lightDirection,
            specularity: f.filter.specularity
          }, filterID: 1122 });
        case "liquify":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Liquify",
            _classID: "LqFy",
            LqMe: f.filter.liquifyMesh
          }, filterID: 1282492025 });
        case "perspective warp":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Perspective Warp",
            _classID: "perspectiveWarpTransform",
            vertices: f.filter.vertices.map(pointToHrznVrtc),
            warpedVertices: f.filter.warpedVertices.map(pointToHrznVrtc),
            quads: f.filter.quads.map((indices) => ({ indices }))
          }, filterID: 442 });
        case "curves":
          return Object.assign(Object.assign({}, base), { Fltr: Object.assign({ _name: "Curves", _classID: "Crvs", presetKind: descriptor_1.presetKindType.encode(f.filter.presetKind) }, f.filter.adjustments ? {
            Adjs: f.filter.adjustments.map((a) => "curve" in a ? {
              _name: "",
              _classID: "CrvA",
              Chnl: a.channels.map(descriptor_1.Chnl.encode),
              "Crv ": a.curve.map((c) => Object.assign({ _name: "", _classID: "Pnt ", Hrzn: c.x, Vrtc: c.y }, c.curved ? { Cnty: true } : {}))
            } : {
              _name: "",
              _classID: "CrvA",
              Chnl: a.channels.map(descriptor_1.Chnl.encode),
              Mpng: a.values
            })
          } : {}), filterID: 1131574899 });
        case "brightness/contrast":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Brightness/Contrast",
            _classID: "BrgC",
            Brgh: f.filter.brightness,
            Cntr: f.filter.contrast,
            useLegacy: !!f.filter.useLegacy
          }, filterID: 1114793795 });
        // case 'hsb/hsl': return {
        // TODO: ...
        // };
        default:
          throw new Error(`Unknow filter type: ${f.type}`);
      }
    }
    function getWarpFromPlacedLayer(placed) {
      if (placed.warp)
        return placed.warp;
      if (!placed.width || !placed.height)
        throw new Error("You must provide width and height of the linked image in placedLayer");
      const w = placed.width;
      const h = placed.height;
      const x0 = 0, x1 = w / 3, x2 = w * 2 / 3, x3 = w;
      const y0 = 0, y1 = h / 3, y2 = h * 2 / 3, y3 = h;
      return {
        style: "custom",
        value: 0,
        perspective: 0,
        perspectiveOther: 0,
        rotate: "horizontal",
        bounds: {
          top: { value: 0, units: "Pixels" },
          left: { value: 0, units: "Pixels" },
          bottom: { value: h, units: "Pixels" },
          right: { value: w, units: "Pixels" }
        },
        uOrder: 4,
        vOrder: 4,
        customEnvelopeWarp: {
          meshPoints: [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x2, y: y0 },
            { x: x3, y: y0 },
            { x: x0, y: y1 },
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x3, y: y1 },
            { x: x0, y: y2 },
            { x: x1, y: y2 },
            { x: x2, y: y2 },
            { x: x3, y: y2 },
            { x: x0, y: y3 },
            { x: x1, y: y3 },
            { x: x2, y: y3 },
            { x: x3, y: y3 }
          ]
        }
      };
    }
    addHandler("SoLd", hasKey("placedLayer"), (reader, target, left) => {
      if ((0, psdReader_1.readSignature)(reader) !== "soLD")
        throw new Error(`Invalid SoLd type`);
      const version = (0, psdReader_1.readInt32)(reader);
      if (version !== 4 && version !== 5)
        throw new Error(`Invalid SoLd version`);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
      target.placedLayer = {
        id: desc.Idnt,
        placed: desc.placed,
        type: placedLayerTypes[desc.Type],
        pageNumber: desc.PgNm,
        totalPages: desc.totalPages,
        frameStep: (0, descriptor_1.frac)(desc.frameStep),
        duration: (0, descriptor_1.frac)(desc.duration),
        frameCount: desc.frameCount,
        transform: desc.Trnf,
        width: desc["Sz  "].Wdth,
        height: desc["Sz  "].Hght,
        resolution: (0, descriptor_1.parseUnits)(desc.Rslt),
        warp: parseWarp(desc.quiltWarp || desc.warp)
      };
      if (desc.nonAffineTransform && desc.nonAffineTransform.some((x2, i2) => x2 !== desc.Trnf[i2])) {
        target.placedLayer.nonAffineTransform = desc.nonAffineTransform;
      }
      if (desc.Crop)
        target.placedLayer.crop = desc.Crop;
      if (desc.comp)
        target.placedLayer.comp = desc.comp;
      if (desc.compInfo) {
        target.placedLayer.compInfo = {
          compID: desc.compInfo.compID,
          originalCompID: desc.compInfo.originalCompID
        };
      }
      if (desc.filterFX)
        target.placedLayer.filter = parseFilterFX(desc.filterFX, reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a2, _b2;
      (0, psdWriter_1.writeSignature)(writer, "soLD");
      (0, psdWriter_1.writeInt32)(writer, 4);
      const placed = target.placedLayer;
      if (!placed.id || typeof placed.id !== "string" || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(placed.id)) {
        throw new Error("Placed layer ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)");
      }
      const desc = Object.assign(Object.assign({ Idnt: placed.id, placed: (_a2 = placed.placed) !== null && _a2 !== void 0 ? _a2 : placed.id, PgNm: placed.pageNumber || 1, totalPages: placed.totalPages || 1 }, placed.crop ? { Crop: placed.crop } : {}), {
        frameStep: placed.frameStep || { numerator: 0, denominator: 600 },
        duration: placed.duration || { numerator: 0, denominator: 600 },
        frameCount: placed.frameCount || 0,
        Annt: 16,
        Type: placedLayerTypes.indexOf(placed.type),
        Trnf: placed.transform,
        nonAffineTransform: (_b2 = placed.nonAffineTransform) !== null && _b2 !== void 0 ? _b2 : placed.transform,
        // quiltWarp: {} as any,
        warp: encodeWarp(getWarpFromPlacedLayer(placed)),
        "Sz  ": {
          _name: "",
          _classID: "Pnt ",
          Wdth: placed.width || 0,
          // TODO: find size ?
          Hght: placed.height || 0
          // TODO: find size ?
        },
        Rslt: placed.resolution ? (0, descriptor_1.unitsValue)(placed.resolution, "resolution") : { units: "Density", value: 72 }
      });
      if (placed.filter) {
        desc.filterFX = {
          _name: "",
          _classID: "filterFXStyle",
          enab: placed.filter.enabled,
          validAtPosition: placed.filter.validAtPosition,
          filterMaskEnable: placed.filter.maskEnabled,
          filterMaskLinked: placed.filter.maskLinked,
          filterMaskExtendWithWhite: placed.filter.maskExtendWithWhite,
          filterFXList: placed.filter.list.map((f) => serializeFilterFXItem(f))
        };
      }
      if (placed.warp && isQuiltWarp(placed.warp)) {
        const quiltWarp = encodeWarp(placed.warp);
        desc.quiltWarp = quiltWarp;
        desc.warp = {
          warpStyle: "warpStyle.warpNone",
          warpValue: quiltWarp.warpValue,
          warpPerspective: quiltWarp.warpPerspective,
          warpPerspectiveOther: quiltWarp.warpPerspectiveOther,
          warpRotate: quiltWarp.warpRotate,
          bounds: quiltWarp.bounds,
          uOrder: quiltWarp.uOrder,
          vOrder: quiltWarp.vOrder
        };
      } else {
        delete desc.quiltWarp;
      }
      if (placed.comp)
        desc.comp = placed.comp;
      if (placed.compInfo)
        desc.compInfo = placed.compInfo;
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, desc.quiltWarp ? "quiltWarp" : "warp");
    });
    addHandlerAlias("SoLE", "SoLd");
    addHandler("fxrp", hasKey("referencePoint"), (reader, target) => {
      target.referencePoint = {
        x: (0, psdReader_1.readFloat64)(reader),
        y: (0, psdReader_1.readFloat64)(reader)
      };
    }, (writer, target) => {
      (0, psdWriter_1.writeFloat64)(writer, target.referencePoint.x);
      (0, psdWriter_1.writeFloat64)(writer, target.referencePoint.y);
    });
    addHandler("Lr16", () => false, (reader, _target, _left, psd, imageResources) => {
      (0, psdReader_1.readLayerInfo)(reader, psd, imageResources);
    }, (_writer, _target) => {
    });
    addHandler("Lr32", () => false, (reader, _target, _left, psd, imageResources) => {
      (0, psdReader_1.readLayerInfo)(reader, psd, imageResources);
    }, (_writer, _target) => {
    });
    addHandler("LMsk", hasKey("userMask"), (reader, target) => {
      target.userMask = {
        colorSpace: (0, psdReader_1.readColor)(reader),
        opacity: (0, psdReader_1.readUint16)(reader) / 255
      };
      const flag = (0, psdReader_1.readUint8)(reader);
      if (flag !== 128)
        throw new Error("Invalid flag value");
      (0, psdReader_1.skipBytes)(reader, 1);
    }, (writer, target) => {
      const userMask = target.userMask;
      (0, psdWriter_1.writeColor)(writer, userMask.colorSpace);
      (0, psdWriter_1.writeUint16)(writer, (0, helpers_1.clamp)(userMask.opacity, 0, 1) * 255);
      (0, psdWriter_1.writeUint8)(writer, 128);
      (0, psdWriter_1.writeZeros)(writer, 1);
    });
    if (helpers_1.MOCK_HANDLERS) {
      addHandler("Patt", (target) => target._Patt !== void 0, (reader, target, left) => {
        target._Patt = (0, psdReader_1.readBytes)(reader, left());
      }, (writer, target) => false);
    } else {
      addHandler(
        "Patt",
        // TODO: handle also Pat2 & Pat3
        // TODO: handle also Pat2 & Pat3
        (target) => !!(target.patterns && target.patterns.length > 0),
        (reader, target, left) => {
          while (left() > 0) {
            const pattern = (0, psdReader_1.readPattern)(reader);
            if (target.patterns === void 0)
              target.patterns = [];
            target.patterns.push(pattern);
          }
        },
        (writer, target, _, _options) => {
          const patterns = target.patterns || [];
          for (const pattern of patterns) {
            (0, psdWriter_1.writePattern)(writer, pattern);
          }
        }
      );
    }
    addHandlerAlias("Pat2", "Patt");
    addHandlerAlias("Pat3", "Patt");
    if (helpers_1.MOCK_HANDLERS) {
      addHandler(
        "CAI ",
        // Content Authenticity Initiative / C2PA provenance metadata
        // Content Authenticity Initiative / C2PA provenance metadata
        (target) => target._CAI_ !== void 0,
        (reader, target, left) => {
          target._CAI_ = (0, psdReader_1.readBytes)(reader, left());
        },
        (writer, target) => {
          (0, psdWriter_1.writeBytes)(writer, target._CAI_);
        }
      );
    }
    if (helpers_1.MOCK_HANDLERS) {
      addHandler(
        "OCIO",
        // Document color management info
        // Document color management info
        (target) => target._OCIO !== void 0,
        (reader, target, left) => {
          target._OCIO = (0, psdReader_1.readBytes)(reader, left());
        },
        (writer, target) => {
          (0, psdWriter_1.writeBytes)(writer, target._OCIO);
        }
      );
    }
    if (helpers_1.MOCK_HANDLERS) {
      addHandler(
        "GenI",
        // Generative Fill / generative AI (Firefly) features
        // Generative Fill / generative AI (Firefly) features
        (target) => target._GenI !== void 0,
        (reader, target, left) => {
          target._GenI = (0, psdReader_1.readBytes)(reader, left());
        },
        (writer, target) => {
          (0, psdWriter_1.writeBytes)(writer, target._GenI);
        }
      );
    }
    function readRect(reader) {
      const top = (0, psdReader_1.readInt32)(reader);
      const left = (0, psdReader_1.readInt32)(reader);
      const bottom = (0, psdReader_1.readInt32)(reader);
      const right = (0, psdReader_1.readInt32)(reader);
      return { top, left, bottom, right };
    }
    function writeRect(writer, rect) {
      (0, psdWriter_1.writeInt32)(writer, rect.top);
      (0, psdWriter_1.writeInt32)(writer, rect.left);
      (0, psdWriter_1.writeInt32)(writer, rect.bottom);
      (0, psdWriter_1.writeInt32)(writer, rect.right);
    }
    addHandler("Anno", (target) => target.annotations !== void 0, (reader, target, left) => {
      const major = (0, psdReader_1.readUint16)(reader);
      const minor = (0, psdReader_1.readUint16)(reader);
      if (major !== 2 || minor !== 1)
        throw new Error("Invalid Anno version");
      const count = (0, psdReader_1.readUint32)(reader);
      const annotations = [];
      for (let i2 = 0; i2 < count; i2++) {
        (0, psdReader_1.readUint32)(reader);
        const type = (0, psdReader_1.readSignature)(reader);
        const open = !!(0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.readUint16)(reader);
        const iconLocation = readRect(reader);
        const popupLocation = readRect(reader);
        const color = (0, psdReader_1.readColor)(reader);
        const author = (0, psdReader_1.readPascalString)(reader, 2);
        const name = (0, psdReader_1.readPascalString)(reader, 2);
        const date = (0, psdReader_1.readPascalString)(reader, 2);
        (0, psdReader_1.readUint32)(reader);
        (0, psdReader_1.readSignature)(reader);
        const dataLength = (0, psdReader_1.readUint32)(reader);
        let data;
        if (type === "txtA") {
          if (dataLength >= 2 && (0, psdReader_1.readUint16)(reader) === 65279) {
            data = (0, psdReader_1.readUnicodeStringWithLength)(reader, (dataLength - 2) / 2);
          } else {
            reader.offset -= 2;
            data = (0, psdReader_1.readAsciiString)(reader, dataLength);
          }
          data = data.replace(/\r/g, "\n");
        } else if (type === "sndA") {
          data = (0, psdReader_1.readBytes)(reader, dataLength);
        } else {
          throw new Error("Unknown annotation type");
        }
        annotations.push({
          type: type === "txtA" ? "text" : "sound",
          open,
          iconLocation,
          popupLocation,
          color,
          author,
          name,
          date,
          data
        });
      }
      target.annotations = annotations;
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const annotations = target.annotations;
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, annotations.length);
      for (const annotation of annotations) {
        const sound = annotation.type === "sound";
        if (sound && !(annotation.data instanceof Uint8Array))
          throw new Error("Sound annotation data should be Uint8Array");
        if (!sound && typeof annotation.data !== "string")
          throw new Error("Text annotation data should be string");
        const lengthOffset = writer.offset;
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeSignature)(writer, sound ? "sndA" : "txtA");
        (0, psdWriter_1.writeUint8)(writer, annotation.open ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, 28);
        (0, psdWriter_1.writeUint16)(writer, 1);
        writeRect(writer, annotation.iconLocation);
        writeRect(writer, annotation.popupLocation);
        (0, psdWriter_1.writeColor)(writer, annotation.color);
        (0, psdWriter_1.writePascalString)(writer, annotation.author || "", 2);
        (0, psdWriter_1.writePascalString)(writer, annotation.name || "", 2);
        (0, psdWriter_1.writePascalString)(writer, annotation.date || "", 2);
        const contentOffset = writer.offset;
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeSignature)(writer, sound ? "sndM" : "txtC");
        (0, psdWriter_1.writeUint32)(writer, 0);
        const dataOffset = writer.offset;
        if (sound) {
          (0, psdWriter_1.writeBytes)(writer, annotation.data);
        } else {
          (0, psdWriter_1.writeUint16)(writer, 65279);
          const text = annotation.data.replace(/\n/g, "\r");
          for (let i2 = 0; i2 < text.length; i2++)
            (0, psdWriter_1.writeUint16)(writer, text.charCodeAt(i2));
        }
        writer.view.setUint32(lengthOffset, writer.offset - lengthOffset, false);
        writer.view.setUint32(contentOffset, writer.offset - contentOffset, false);
        writer.view.setUint32(dataOffset - 4, writer.offset - dataOffset, false);
      }
    });
    function createLnkHandler(tag) {
      addHandler(tag, (target) => {
        const psd = target;
        if (!psd.linkedFiles || !psd.linkedFiles.length)
          return false;
        if (tag === "lnkE" && !psd.linkedFiles.some((f) => f.linkedFile))
          return false;
        return true;
      }, (reader, target, left, _psd) => {
        const psd = target;
        psd.linkedFiles = psd.linkedFiles || [];
        while (left() > 8) {
          let size = readLength64(reader);
          const startOffset = reader.offset;
          const type = (0, psdReader_1.readSignature)(reader);
          const version = (0, psdReader_1.readInt32)(reader);
          const id = (0, psdReader_1.readPascalString)(reader, 1);
          const name = (0, psdReader_1.readUnicodeString)(reader);
          const fileType = (0, psdReader_1.readSignature)(reader).trim();
          const fileCreator = (0, psdReader_1.readSignature)(reader).trim();
          const dataSize = readLength64(reader);
          const hasFileOpenDescriptor = (0, psdReader_1.readUint8)(reader);
          const fileOpenDescriptor = hasFileOpenDescriptor ? (0, descriptor_1.readVersionAndDescriptor)(reader) : void 0;
          const linkedFileDescriptor = type === "liFE" ? (0, descriptor_1.readVersionAndDescriptor)(reader) : void 0;
          const file = { id, name };
          if (fileType)
            file.type = fileType;
          if (fileCreator)
            file.creator = fileCreator;
          if (fileOpenDescriptor) {
            file.descriptor = {
              compInfo: {
                compID: fileOpenDescriptor.compInfo.compID,
                originalCompID: fileOpenDescriptor.compInfo.originalCompID
              }
            };
          }
          if (type === "liFE" && version > 3) {
            const year = (0, psdReader_1.readInt32)(reader);
            const month = (0, psdReader_1.readUint8)(reader);
            const day = (0, psdReader_1.readUint8)(reader);
            const hour = (0, psdReader_1.readUint8)(reader);
            const minute = (0, psdReader_1.readUint8)(reader);
            const seconds = (0, psdReader_1.readFloat64)(reader);
            const wholeSeconds = Math.floor(seconds);
            const ms = (seconds - wholeSeconds) * 1e3;
            file.time = new Date(Date.UTC(year, month, day, hour, minute, wholeSeconds, ms)).toISOString();
          }
          const fileSize = type === "liFE" ? readLength64(reader) : 0;
          if (type === "liFA")
            (0, psdReader_1.skipBytes)(reader, 8);
          if (type === "liFD")
            file.data = (0, psdReader_1.readBytes)(reader, dataSize);
          if (version >= 5)
            file.childDocumentID = (0, psdReader_1.readUnicodeString)(reader);
          if (version >= 6)
            file.assetModTime = (0, psdReader_1.readFloat64)(reader);
          if (version >= 7)
            file.assetLockedState = (0, psdReader_1.readUint8)(reader);
          if (type === "liFE" && version === 2)
            file.data = (0, psdReader_1.readBytes)(reader, fileSize);
          if (reader.skipLinkedFilesData)
            file.data = void 0;
          if (tag === "lnkE") {
            file.linkedFile = {
              fileSize,
              name: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor["Nm  "]) || "",
              fullPath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.fullPath) || "",
              originalPath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.originalPath) || "",
              relativePath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.relPath) || ""
            };
          }
          psd.linkedFiles.push(file);
          while (size % 4)
            size++;
          reader.offset = startOffset + size;
        }
        (0, psdReader_1.skipBytes)(reader, left());
      }, (writer, target) => {
        var _a2, _b2, _c, _d, _e, _f, _g, _h, _j;
        const psd = target;
        for (const file of psd.linkedFiles) {
          if (tag === "lnkE" !== !!file.linkedFile)
            continue;
          let version = 2;
          if (file.assetLockedState != null)
            version = 7;
          else if (file.assetModTime != null)
            version = 6;
          else if (file.childDocumentID != null)
            version = 5;
          else if (tag === "lnkE")
            version = 3;
          writeLength64(writer, 0);
          const sizeOffset = writer.offset;
          (0, psdWriter_1.writeSignature)(writer, tag === "lnkE" ? "liFE" : file.data ? "liFD" : "liFA");
          (0, psdWriter_1.writeInt32)(writer, version);
          if (!file.id || typeof file.id !== "string" || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(file.id)) {
            throw new Error("Linked file ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)");
          }
          (0, psdWriter_1.writePascalString)(writer, file.id, 1);
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, file.name || "");
          (0, psdWriter_1.writeSignature)(writer, file.type ? `${file.type}    `.substring(0, 4) : "    ");
          (0, psdWriter_1.writeSignature)(writer, file.creator ? `${file.creator}    `.substring(0, 4) : "\0\0\0\0");
          writeLength64(writer, file.data ? file.data.byteLength : 0);
          if (file.descriptor && file.descriptor.compInfo) {
            const desc = {
              compInfo: {
                compID: file.descriptor.compInfo.compID,
                originalCompID: file.descriptor.compInfo.originalCompID
              }
            };
            (0, psdWriter_1.writeUint8)(writer, 1);
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
          } else {
            (0, psdWriter_1.writeUint8)(writer, 0);
          }
          if (tag === "lnkE") {
            const desc = {
              descVersion: 2,
              "Nm  ": (_b2 = (_a2 = file.linkedFile) === null || _a2 === void 0 ? void 0 : _a2.name) !== null && _b2 !== void 0 ? _b2 : "",
              fullPath: (_d = (_c = file.linkedFile) === null || _c === void 0 ? void 0 : _c.fullPath) !== null && _d !== void 0 ? _d : "",
              originalPath: (_f = (_e = file.linkedFile) === null || _e === void 0 ? void 0 : _e.originalPath) !== null && _f !== void 0 ? _f : "",
              relPath: (_h = (_g = file.linkedFile) === null || _g === void 0 ? void 0 : _g.relativePath) !== null && _h !== void 0 ? _h : ""
            };
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "ExternalFileLink", desc);
            const time = file.time ? new Date(file.time) : /* @__PURE__ */ new Date();
            (0, psdWriter_1.writeInt32)(writer, time.getUTCFullYear());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCMonth());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCDate());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCHours());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCMinutes());
            (0, psdWriter_1.writeFloat64)(writer, time.getUTCSeconds() + time.getUTCMilliseconds() / 1e3);
          }
          if (file.data) {
            (0, psdWriter_1.writeBytes)(writer, file.data);
          } else {
            writeLength64(writer, ((_j = file.linkedFile) === null || _j === void 0 ? void 0 : _j.fileSize) || 0);
          }
          if (version >= 5)
            (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, file.childDocumentID || "");
          if (version >= 6)
            (0, psdWriter_1.writeFloat64)(writer, file.assetModTime || 0);
          if (version >= 7)
            (0, psdWriter_1.writeUint8)(writer, file.assetLockedState || 0);
          let size = writer.offset - sizeOffset;
          writer.view.setUint32(sizeOffset - 4, size, false);
          while (size % 4) {
            size++;
            (0, psdWriter_1.writeUint8)(writer, 0);
          }
        }
      });
    }
    createLnkHandler("lnk2");
    createLnkHandler("lnkE");
    addHandlerAlias("lnkD", "lnk2");
    addHandlerAlias("lnk3", "lnk2");
    addHandler("pths", hasKey("pathList"), (reader, target) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
      desc;
      target.pathList = [];
    }, (writer, _target) => {
      const desc = {
        pathList: []
        // TODO: write paths
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "pathsDataClass", desc);
    });
    addHandler("lyvr", hasKey("version"), (reader, target) => target.version = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.version));
    addHandler(
      "lfxs",
      () => false,
      // TODO: not sure when we actually need to write this section
      // NOTE: this might be insufficient
      // target => target.effects !== undefined && (
      // 	!!target.effects.dropShadow?.some(e => e.choke) ||
      // 	!!target.effects.innerShadow?.some(e => e.choke) ||
      // 	!!target.effects.outerGlow?.choke ||
      // 	!!target.effects.innerGlow?.choke
      // ),
      (reader, target, left) => {
        const version = (0, psdReader_1.readUint32)(reader);
        if (version !== 0)
          throw new Error(`Invalid lfxs version`);
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.effects = (0, descriptor_1.parseEffects)(desc, !!reader.logMissingFeatures);
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target, _, options) => {
        const desc = (0, descriptor_1.serializeEffects)(target.effects, !!options.logMissingFeatures, true);
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      }
    );
    function adjustmentType(type) {
      return (target) => !!target.adjustment && target.adjustment.type === type;
    }
    addHandler("brit", adjustmentType("brightness/contrast"), (reader, target, left) => {
      if (!target.adjustment) {
        target.adjustment = {
          type: "brightness/contrast",
          brightness: (0, psdReader_1.readInt16)(reader),
          contrast: (0, psdReader_1.readInt16)(reader),
          meanValue: (0, psdReader_1.readInt16)(reader),
          labColorOnly: !!(0, psdReader_1.readUint8)(reader),
          useLegacy: true
        };
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a2;
      const info = target.adjustment;
      (0, psdWriter_1.writeInt16)(writer, info.brightness || 0);
      (0, psdWriter_1.writeInt16)(writer, info.contrast || 0);
      (0, psdWriter_1.writeInt16)(writer, (_a2 = info.meanValue) !== null && _a2 !== void 0 ? _a2 : 127);
      (0, psdWriter_1.writeUint8)(writer, info.labColorOnly ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 1);
    });
    function readLevelsChannel(reader) {
      const shadowInput = (0, psdReader_1.readInt16)(reader);
      const highlightInput = (0, psdReader_1.readInt16)(reader);
      const shadowOutput = (0, psdReader_1.readInt16)(reader);
      const highlightOutput = (0, psdReader_1.readInt16)(reader);
      const midtoneInput = (0, psdReader_1.readInt16)(reader) / 100;
      return { shadowInput, highlightInput, shadowOutput, highlightOutput, midtoneInput };
    }
    function writeLevelsChannel(writer, channel) {
      (0, psdWriter_1.writeInt16)(writer, channel.shadowInput);
      (0, psdWriter_1.writeInt16)(writer, channel.highlightInput);
      (0, psdWriter_1.writeInt16)(writer, channel.shadowOutput);
      (0, psdWriter_1.writeInt16)(writer, channel.highlightOutput);
      (0, psdWriter_1.writeInt16)(writer, Math.round(channel.midtoneInput * 100));
    }
    addHandler("levl", adjustmentType("levels"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 2)
        throw new Error("Invalid levl version");
      const levels = [];
      for (let i2 = 0; i2 < 29 && left(); i2++) {
        levels.push(readLevelsChannel(reader));
      }
      const [rgb, red, green, blue] = levels;
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), {
        type: "levels",
        rgb,
        red,
        green,
        blue
      });
      if (left()) {
        if ((0, psdReader_1.readSignature)(reader) !== "Lvls")
          throw new Error(`Invalid levl signature`);
        if ((0, psdReader_1.readUint16)(reader) !== 3)
          throw new Error(`Invalid levl version`);
        const totalChannelRecords = (0, psdReader_1.readUint16)(reader);
        for (let i2 = 0; i2 < totalChannelRecords - levels.length && left(); i2++) {
          levels.push(readLevelsChannel(reader));
        }
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const defaultChannel = {
        shadowInput: 0,
        highlightInput: 255,
        shadowOutput: 0,
        highlightOutput: 255,
        midtoneInput: 1
      };
      (0, psdWriter_1.writeUint16)(writer, 2);
      writeLevelsChannel(writer, info.rgb || defaultChannel);
      writeLevelsChannel(writer, info.red || defaultChannel);
      writeLevelsChannel(writer, info.green || defaultChannel);
      writeLevelsChannel(writer, info.blue || defaultChannel);
      for (let i2 = 0; i2 < 29 - 4; i2++) {
        writeLevelsChannel(writer, defaultChannel);
      }
      (0, psdWriter_1.writeSignature)(writer, "Lvls");
      (0, psdWriter_1.writeUint16)(writer, 3);
      (0, psdWriter_1.writeUint16)(writer, 62);
      for (let i2 = 0; i2 < 62 - 29; i2++) {
        writeLevelsChannel(writer, defaultChannel);
      }
    });
    function readCurveChannel(reader) {
      const nodes = (0, psdReader_1.readUint16)(reader);
      const channel = [];
      for (let j = 0; j < nodes; j++) {
        const output = (0, psdReader_1.readInt16)(reader);
        const input = (0, psdReader_1.readInt16)(reader);
        channel.push({ input, output });
      }
      return channel;
    }
    function writeCurveChannel(writer, channel) {
      (0, psdWriter_1.writeUint16)(writer, channel.length);
      for (const n of channel) {
        (0, psdWriter_1.writeUint16)(writer, n.output);
        (0, psdWriter_1.writeUint16)(writer, n.input);
      }
    }
    addHandler("curv", adjustmentType("curves"), (reader, target, left) => {
      (0, psdReader_1.readUint8)(reader);
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid curv version");
      (0, psdReader_1.readUint16)(reader);
      const channels = (0, psdReader_1.readUint16)(reader);
      const info = { type: "curves" };
      if (channels & 1)
        info.rgb = readCurveChannel(reader);
      if (channels & 2)
        info.red = readCurveChannel(reader);
      if (channels & 4)
        info.green = readCurveChannel(reader);
      if (channels & 8)
        info.blue = readCurveChannel(reader);
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), info);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const { rgb, red, green, blue } = info;
      let channels = 0;
      let channelCount = 0;
      if (rgb && rgb.length) {
        channels |= 1;
        channelCount++;
      }
      if (red && red.length) {
        channels |= 2;
        channelCount++;
      }
      if (green && green.length) {
        channels |= 4;
        channelCount++;
      }
      if (blue && blue.length) {
        channels |= 8;
        channelCount++;
      }
      (0, psdWriter_1.writeUint8)(writer, 0);
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint16)(writer, 0);
      (0, psdWriter_1.writeUint16)(writer, channels);
      if (rgb && rgb.length)
        writeCurveChannel(writer, rgb);
      if (red && red.length)
        writeCurveChannel(writer, red);
      if (green && green.length)
        writeCurveChannel(writer, green);
      if (blue && blue.length)
        writeCurveChannel(writer, blue);
      (0, psdWriter_1.writeSignature)(writer, "Crv ");
      (0, psdWriter_1.writeUint16)(writer, 4);
      (0, psdWriter_1.writeUint16)(writer, 0);
      (0, psdWriter_1.writeUint16)(writer, channelCount);
      if (rgb && rgb.length) {
        (0, psdWriter_1.writeUint16)(writer, 0);
        writeCurveChannel(writer, rgb);
      }
      if (red && red.length) {
        (0, psdWriter_1.writeUint16)(writer, 1);
        writeCurveChannel(writer, red);
      }
      if (green && green.length) {
        (0, psdWriter_1.writeUint16)(writer, 2);
        writeCurveChannel(writer, green);
      }
      if (blue && blue.length) {
        (0, psdWriter_1.writeUint16)(writer, 3);
        writeCurveChannel(writer, blue);
      }
    });
    addHandler("expA", adjustmentType("exposure"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid expA version");
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "exposure", exposure: (0, psdReader_1.readFloat32)(reader), offset: (0, psdReader_1.readFloat32)(reader), gamma: (0, psdReader_1.readFloat32)(reader) });
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeFloat32)(writer, info.exposure);
      (0, psdWriter_1.writeFloat32)(writer, info.offset);
      (0, psdWriter_1.writeFloat32)(writer, info.gamma);
      (0, psdWriter_1.writeZeros)(writer, 2);
    });
    addHandler("vibA", adjustmentType("vibrance"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.adjustment = { type: "vibrance" };
      if (desc.vibrance !== void 0)
        target.adjustment.vibrance = desc.vibrance;
      if (desc.Strt !== void 0)
        target.adjustment.saturation = desc.Strt;
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const desc = {};
      if (info.vibrance !== void 0)
        desc.vibrance = info.vibrance;
      if (info.saturation !== void 0)
        desc.Strt = info.saturation;
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    function readHueChannel(reader) {
      return {
        a: (0, psdReader_1.readInt16)(reader),
        b: (0, psdReader_1.readInt16)(reader),
        c: (0, psdReader_1.readInt16)(reader),
        d: (0, psdReader_1.readInt16)(reader),
        hue: (0, psdReader_1.readInt16)(reader),
        saturation: (0, psdReader_1.readInt16)(reader),
        lightness: (0, psdReader_1.readInt16)(reader)
      };
    }
    function writeHueChannel(writer, channel) {
      const c = channel || {};
      (0, psdWriter_1.writeInt16)(writer, c.a || 0);
      (0, psdWriter_1.writeInt16)(writer, c.b || 0);
      (0, psdWriter_1.writeInt16)(writer, c.c || 0);
      (0, psdWriter_1.writeInt16)(writer, c.d || 0);
      (0, psdWriter_1.writeInt16)(writer, c.hue || 0);
      (0, psdWriter_1.writeInt16)(writer, c.saturation || 0);
      (0, psdWriter_1.writeInt16)(writer, c.lightness || 0);
    }
    addHandler("hue2", adjustmentType("hue/saturation"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 2)
        throw new Error("Invalid hue2 version");
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "hue/saturation", master: readHueChannel(reader), reds: readHueChannel(reader), yellows: readHueChannel(reader), greens: readHueChannel(reader), cyans: readHueChannel(reader), blues: readHueChannel(reader), magentas: readHueChannel(reader) });
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 2);
      writeHueChannel(writer, info.master);
      writeHueChannel(writer, info.reds);
      writeHueChannel(writer, info.yellows);
      writeHueChannel(writer, info.greens);
      writeHueChannel(writer, info.cyans);
      writeHueChannel(writer, info.blues);
      writeHueChannel(writer, info.magentas);
    });
    function readColorBalance(reader) {
      return {
        cyanRed: (0, psdReader_1.readInt16)(reader),
        magentaGreen: (0, psdReader_1.readInt16)(reader),
        yellowBlue: (0, psdReader_1.readInt16)(reader)
      };
    }
    function writeColorBalance(writer, value) {
      (0, psdWriter_1.writeInt16)(writer, value.cyanRed || 0);
      (0, psdWriter_1.writeInt16)(writer, value.magentaGreen || 0);
      (0, psdWriter_1.writeInt16)(writer, value.yellowBlue || 0);
    }
    addHandler("blnc", adjustmentType("color balance"), (reader, target, left) => {
      target.adjustment = {
        type: "color balance",
        shadows: readColorBalance(reader),
        midtones: readColorBalance(reader),
        highlights: readColorBalance(reader),
        preserveLuminosity: !!(0, psdReader_1.readUint8)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      writeColorBalance(writer, info.shadows || {});
      writeColorBalance(writer, info.midtones || {});
      writeColorBalance(writer, info.highlights || {});
      (0, psdWriter_1.writeUint8)(writer, info.preserveLuminosity ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 1);
    });
    addHandler("blwh", adjustmentType("black & white"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.adjustment = {
        type: "black & white",
        reds: desc["Rd  "],
        yellows: desc.Yllw,
        greens: desc["Grn "],
        cyans: desc["Cyn "],
        blues: desc["Bl  "],
        magentas: desc.Mgnt,
        useTint: !!desc.useTint,
        presetKind: desc.bwPresetKind,
        presetFileName: desc.blackAndWhitePresetFileName
      };
      if (desc.tintColor !== void 0)
        target.adjustment.tintColor = (0, descriptor_1.parseColor)(desc.tintColor);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const desc = {
        "Rd  ": info.reds || 0,
        Yllw: info.yellows || 0,
        "Grn ": info.greens || 0,
        "Cyn ": info.cyans || 0,
        "Bl  ": info.blues || 0,
        Mgnt: info.magentas || 0,
        useTint: !!info.useTint,
        tintColor: (0, descriptor_1.serializeColor)(info.tintColor),
        bwPresetKind: info.presetKind || 0,
        blackAndWhitePresetFileName: info.presetFileName || ""
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("phfl", adjustmentType("photo filter"), (reader, target, left) => {
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 2 && version !== 3)
        throw new Error("Invalid phfl version");
      let color;
      if (version === 2) {
        color = (0, psdReader_1.readColor)(reader);
      } else {
        color = {
          l: (0, psdReader_1.readInt32)(reader) / 100,
          a: (0, psdReader_1.readInt32)(reader) / 100,
          b: (0, psdReader_1.readInt32)(reader) / 100
        };
      }
      target.adjustment = {
        type: "photo filter",
        color,
        density: (0, psdReader_1.readUint32)(reader) / 100,
        preserveLuminosity: !!(0, psdReader_1.readUint8)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeColor)(writer, info.color || { l: 0, a: 0, b: 0 });
      (0, psdWriter_1.writeUint32)(writer, (info.density || 0) * 100);
      (0, psdWriter_1.writeUint8)(writer, info.preserveLuminosity ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    function readMixrChannel(reader) {
      const red = (0, psdReader_1.readInt16)(reader);
      const green = (0, psdReader_1.readInt16)(reader);
      const blue = (0, psdReader_1.readInt16)(reader);
      (0, psdReader_1.skipBytes)(reader, 2);
      const constant = (0, psdReader_1.readInt16)(reader);
      return { red, green, blue, constant };
    }
    function writeMixrChannel(writer, channel) {
      const c = channel || {};
      (0, psdWriter_1.writeInt16)(writer, c.red);
      (0, psdWriter_1.writeInt16)(writer, c.green);
      (0, psdWriter_1.writeInt16)(writer, c.blue);
      (0, psdWriter_1.writeZeros)(writer, 2);
      (0, psdWriter_1.writeInt16)(writer, c.constant);
    }
    addHandler("mixr", adjustmentType("channel mixer"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid mixr version");
      const adjustment = target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "channel mixer", monochrome: !!(0, psdReader_1.readUint16)(reader) });
      if (!adjustment.monochrome) {
        adjustment.red = readMixrChannel(reader);
        adjustment.green = readMixrChannel(reader);
        adjustment.blue = readMixrChannel(reader);
      }
      adjustment.gray = readMixrChannel(reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint16)(writer, info.monochrome ? 1 : 0);
      if (info.monochrome) {
        writeMixrChannel(writer, info.gray);
        (0, psdWriter_1.writeZeros)(writer, 3 * 5 * 2);
      } else {
        writeMixrChannel(writer, info.red);
        writeMixrChannel(writer, info.green);
        writeMixrChannel(writer, info.blue);
        writeMixrChannel(writer, info.gray);
      }
    });
    var colorLookupType = (0, helpers_1.createEnum)("colorLookupType", "3dlut", {
      "3dlut": "3DLUT",
      abstractProfile: "abstractProfile",
      deviceLinkProfile: "deviceLinkProfile"
    });
    var LUTFormatType = (0, helpers_1.createEnum)("LUTFormatType", "look", {
      look: "LUTFormatLOOK",
      cube: "LUTFormatCUBE",
      "3dl": "LUTFormat3DL"
    });
    var colorLookupOrder = (0, helpers_1.createEnum)("colorLookupOrder", "rgb", {
      rgb: "rgbOrder",
      bgr: "bgrOrder"
    });
    addHandler("clrL", adjustmentType("color lookup"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid clrL version");
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.adjustment = { type: "color lookup" };
      const info = target.adjustment;
      if (desc.lookupType !== void 0)
        info.lookupType = colorLookupType.decode(desc.lookupType);
      if (desc["Nm  "] !== void 0)
        info.name = desc["Nm  "];
      if (desc.Dthr !== void 0)
        info.dither = desc.Dthr;
      if (desc.profile !== void 0)
        info.profile = desc.profile;
      if (desc.LUTFormat !== void 0)
        info.lutFormat = LUTFormatType.decode(desc.LUTFormat);
      if (desc.dataOrder !== void 0)
        info.dataOrder = colorLookupOrder.decode(desc.dataOrder);
      if (desc.tableOrder !== void 0)
        info.tableOrder = colorLookupOrder.decode(desc.tableOrder);
      if (desc.LUT3DFileData !== void 0)
        info.lut3DFileData = desc.LUT3DFileData;
      if (desc.LUT3DFileName !== void 0)
        info.lut3DFileName = desc.LUT3DFileName;
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const desc = {};
      if (info.lookupType !== void 0)
        desc.lookupType = colorLookupType.encode(info.lookupType);
      if (info.name !== void 0)
        desc["Nm  "] = info.name;
      if (info.dither !== void 0)
        desc.Dthr = info.dither;
      if (info.profile !== void 0)
        desc.profile = info.profile;
      if (info.lutFormat !== void 0)
        desc.LUTFormat = LUTFormatType.encode(info.lutFormat);
      if (info.dataOrder !== void 0)
        desc.dataOrder = colorLookupOrder.encode(info.dataOrder);
      if (info.tableOrder !== void 0)
        desc.tableOrder = colorLookupOrder.encode(info.tableOrder);
      if (info.lut3DFileData !== void 0)
        desc.LUT3DFileData = info.lut3DFileData;
      if (info.lut3DFileName !== void 0)
        desc.LUT3DFileName = info.lut3DFileName;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("nvrt", adjustmentType("invert"), (reader, target, left) => {
      target.adjustment = { type: "invert" };
      (0, psdReader_1.skipBytes)(reader, left());
    }, () => {
    });
    addHandler("post", adjustmentType("posterize"), (reader, target, left) => {
      target.adjustment = {
        type: "posterize",
        levels: (0, psdReader_1.readUint16)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a2;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, (_a2 = info.levels) !== null && _a2 !== void 0 ? _a2 : 4);
      (0, psdWriter_1.writeZeros)(writer, 2);
    });
    addHandler("thrs", adjustmentType("threshold"), (reader, target, left) => {
      target.adjustment = {
        type: "threshold",
        level: (0, psdReader_1.readUint16)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a2;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, (_a2 = info.level) !== null && _a2 !== void 0 ? _a2 : 128);
      (0, psdWriter_1.writeZeros)(writer, 2);
    });
    var grdmColorModels = ["", "", "", "rgb", "hsb", "", "lab"];
    addHandler("grdm", adjustmentType("gradient map"), (reader, target, left) => {
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 1 && version !== 3)
        throw new Error("Invalid grdm version");
      const info = {
        type: "gradient map",
        gradientType: "solid"
      };
      info.reverse = !!(0, psdReader_1.readUint8)(reader);
      info.dither = !!(0, psdReader_1.readUint8)(reader);
      const hasMethod = !!(0, psdReader_1.readUint8)(reader);
      reader.offset--;
      if (hasMethod) {
        const method = (0, psdReader_1.readSignature)(reader);
        info.method = descriptor_1.gradientInterpolationMethodType.decode(method);
      }
      info.name = (0, psdReader_1.readUnicodeString)(reader);
      info.colorStops = [];
      info.opacityStops = [];
      const stopsCount = (0, psdReader_1.readUint16)(reader);
      for (let i2 = 0; i2 < stopsCount; i2++) {
        info.colorStops.push({
          location: (0, psdReader_1.readUint32)(reader),
          midpoint: (0, psdReader_1.readUint32)(reader) / 100,
          color: (0, psdReader_1.readColor)(reader)
        });
        (0, psdReader_1.skipBytes)(reader, 2);
      }
      const opacityStopsCount = (0, psdReader_1.readUint16)(reader);
      for (let i2 = 0; i2 < opacityStopsCount; i2++) {
        info.opacityStops.push({
          location: (0, psdReader_1.readUint32)(reader),
          midpoint: (0, psdReader_1.readUint32)(reader) / 100,
          opacity: (0, psdReader_1.readUint16)(reader) / 255
        });
      }
      const expansionCount = (0, psdReader_1.readUint16)(reader);
      if (expansionCount !== 2)
        throw new Error("Invalid grdm expansion count");
      const interpolation = (0, psdReader_1.readUint16)(reader);
      info.smoothness = interpolation / 4096;
      const length = (0, psdReader_1.readUint16)(reader);
      if (length !== 32)
        throw new Error("Invalid grdm length");
      info.gradientType = (0, psdReader_1.readUint16)(reader) ? "noise" : "solid";
      info.randomSeed = (0, psdReader_1.readUint32)(reader);
      info.addTransparency = !!(0, psdReader_1.readUint16)(reader);
      info.restrictColors = !!(0, psdReader_1.readUint16)(reader);
      info.roughness = (0, psdReader_1.readUint32)(reader) / 4096;
      info.colorModel = grdmColorModels[(0, psdReader_1.readUint16)(reader)] || "rgb";
      info.min = [
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768
      ];
      info.max = [
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768
      ];
      (0, psdReader_1.skipBytes)(reader, left());
      for (const s of info.colorStops)
        s.location /= interpolation;
      for (const s of info.opacityStops)
        s.location /= interpolation;
      target.adjustment = info;
    }, (writer, target) => {
      var _a2, _b2, _c;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, info.method !== void 0 ? 3 : 1);
      (0, psdWriter_1.writeUint8)(writer, info.reverse ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, info.dither ? 1 : 0);
      if (info.method !== void 0) {
        (0, psdWriter_1.writeSignature)(writer, descriptor_1.gradientInterpolationMethodType.encode(info.method));
      }
      (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, info.name || "");
      (0, psdWriter_1.writeUint16)(writer, info.colorStops && info.colorStops.length || 0);
      const interpolation = Math.round(((_a2 = info.smoothness) !== null && _a2 !== void 0 ? _a2 : 1) * 4096);
      for (const s of info.colorStops || []) {
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.location * interpolation));
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.midpoint * 100));
        (0, psdWriter_1.writeColor)(writer, s.color);
        (0, psdWriter_1.writeZeros)(writer, 2);
      }
      (0, psdWriter_1.writeUint16)(writer, info.opacityStops && info.opacityStops.length || 0);
      for (const s of info.opacityStops || []) {
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.location * interpolation));
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.midpoint * 100));
        (0, psdWriter_1.writeUint16)(writer, Math.round(s.opacity * 255));
      }
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeUint16)(writer, interpolation);
      (0, psdWriter_1.writeUint16)(writer, 32);
      (0, psdWriter_1.writeUint16)(writer, info.gradientType === "noise" ? 1 : 0);
      (0, psdWriter_1.writeUint32)(writer, info.randomSeed || 0);
      (0, psdWriter_1.writeUint16)(writer, info.addTransparency ? 1 : 0);
      (0, psdWriter_1.writeUint16)(writer, info.restrictColors ? 1 : 0);
      (0, psdWriter_1.writeUint32)(writer, Math.round(((_b2 = info.roughness) !== null && _b2 !== void 0 ? _b2 : 1) * 4096));
      const colorModel = grdmColorModels.indexOf((_c = info.colorModel) !== null && _c !== void 0 ? _c : "rgb");
      (0, psdWriter_1.writeUint16)(writer, colorModel === -1 ? 3 : colorModel);
      for (let i2 = 0; i2 < 4; i2++)
        (0, psdWriter_1.writeUint16)(writer, Math.round((info.min && info.min[i2] || 0) * 32768));
      for (let i2 = 0; i2 < 4; i2++)
        (0, psdWriter_1.writeUint16)(writer, Math.round((info.max && info.max[i2] || 0) * 32768));
      (0, psdWriter_1.writeZeros)(writer, 4);
    });
    function readSelectiveColors(reader) {
      return {
        c: (0, psdReader_1.readInt16)(reader),
        m: (0, psdReader_1.readInt16)(reader),
        y: (0, psdReader_1.readInt16)(reader),
        k: (0, psdReader_1.readInt16)(reader)
      };
    }
    function writeSelectiveColors(writer, cmyk) {
      const c = cmyk || {};
      (0, psdWriter_1.writeInt16)(writer, c.c);
      (0, psdWriter_1.writeInt16)(writer, c.m);
      (0, psdWriter_1.writeInt16)(writer, c.y);
      (0, psdWriter_1.writeInt16)(writer, c.k);
    }
    addHandler("selc", adjustmentType("selective color"), (reader, target) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid selc version");
      const mode = (0, psdReader_1.readUint16)(reader) ? "absolute" : "relative";
      (0, psdReader_1.skipBytes)(reader, 8);
      target.adjustment = {
        type: "selective color",
        mode,
        reds: readSelectiveColors(reader),
        yellows: readSelectiveColors(reader),
        greens: readSelectiveColors(reader),
        cyans: readSelectiveColors(reader),
        blues: readSelectiveColors(reader),
        magentas: readSelectiveColors(reader),
        whites: readSelectiveColors(reader),
        neutrals: readSelectiveColors(reader),
        blacks: readSelectiveColors(reader)
      };
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint16)(writer, info.mode === "absolute" ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 8);
      writeSelectiveColors(writer, info.reds);
      writeSelectiveColors(writer, info.yellows);
      writeSelectiveColors(writer, info.greens);
      writeSelectiveColors(writer, info.cyans);
      writeSelectiveColors(writer, info.blues);
      writeSelectiveColors(writer, info.magentas);
      writeSelectiveColors(writer, info.whites);
      writeSelectiveColors(writer, info.neutrals);
      writeSelectiveColors(writer, info.blacks);
    });
    addHandler("CgEd", (target) => {
      const a = target.adjustment;
      if (!a)
        return false;
      return a.type === "brightness/contrast" && !a.useLegacy || (a.type === "levels" || a.type === "curves" || a.type === "exposure" || a.type === "channel mixer" || a.type === "hue/saturation") && a.presetFileName !== void 0;
    }, (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if (desc.Vrsn !== 1)
        throw new Error("Invalid CgEd version");
      if ("presetFileName" in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.presetKind, presetFileName: desc.presetFileName });
      } else if ("curvesPresetFileName" in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.curvesPresetKind, presetFileName: desc.curvesPresetFileName });
      } else if ("mixerPresetFileName" in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.mixerPresetKind, presetFileName: desc.mixerPresetFileName });
      } else {
        target.adjustment = {
          type: "brightness/contrast",
          brightness: desc.Brgh,
          contrast: desc.Cntr,
          meanValue: desc.means,
          useLegacy: !!desc.useLegacy,
          labColorOnly: !!desc["Lab "],
          auto: !!desc.Auto
        };
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a2, _b2, _c, _d;
      const info = target.adjustment;
      if (info.type === "levels" || info.type === "exposure" || info.type === "hue/saturation") {
        const desc = {
          Vrsn: 1,
          presetKind: (_a2 = info.presetKind) !== null && _a2 !== void 0 ? _a2 : 1,
          presetFileName: info.presetFileName || ""
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else if (info.type === "curves") {
        const desc = {
          Vrsn: 1,
          curvesPresetKind: (_b2 = info.presetKind) !== null && _b2 !== void 0 ? _b2 : 1,
          curvesPresetFileName: info.presetFileName || ""
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else if (info.type === "channel mixer") {
        const desc = {
          Vrsn: 1,
          mixerPresetKind: (_c = info.presetKind) !== null && _c !== void 0 ? _c : 1,
          mixerPresetFileName: info.presetFileName || ""
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else if (info.type === "brightness/contrast") {
        const desc = {
          Vrsn: 1,
          Brgh: info.brightness || 0,
          Cntr: info.contrast || 0,
          means: (_d = info.meanValue) !== null && _d !== void 0 ? _d : 127,
          "Lab ": !!info.labColorOnly,
          useLegacy: !!info.useLegacy,
          Auto: !!info.auto
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else {
        throw new Error("Unhandled CgEd case");
      }
    });
    function getTextLayersSortedByIndex(psd) {
      const layers = [];
      function collect(layer) {
        var _a2;
        if (layer.children) {
          for (const child of layer.children) {
            if (((_a2 = child.text) === null || _a2 === void 0 ? void 0 : _a2.index) !== void 0) {
              layers[child.text.index] = child;
            }
            collect(child);
          }
        }
      }
      collect(psd);
      return layers;
    }
    addHandler("Txt2", hasKey("engineData"), (reader, target, left, psd) => {
      const data = (0, psdReader_1.readBytes)(reader, left());
      target.engineData = (0, base64_js_1.fromByteArray)(data);
      const layersByIndex = getTextLayersSortedByIndex(psd);
      const engineData = (0, engineData_1.parseEngineData)(data);
      const engineData2 = (0, engineData2_1.decodeEngineData2)(engineData);
      const TextFrameSet = engineData2.ResourceDict.TextFrameSet;
      if (TextFrameSet) {
        for (let i2 = 0; i2 < TextFrameSet.length; i2++) {
          const layer = layersByIndex[i2];
          if (TextFrameSet[i2].path && (layer === null || layer === void 0 ? void 0 : layer.text)) {
            layer.text.textPath = TextFrameSet[i2].path;
          }
        }
      }
    }, (writer, target) => {
      const buffer = (0, base64_js_1.toByteArray)(target.engineData);
      (0, psdWriter_1.writeBytes)(writer, buffer);
    });
    addHandler("FEid", hasKey("filterEffectsMasks"), (reader, target, leftBytes) => {
      const version = (0, psdReader_1.readInt32)(reader);
      if (version < 1 || version > 3)
        throw new Error(`Invalid filterEffects version ${version}`);
      target.filterEffectsMasks = [];
      while (leftBytes() > 8) {
        if ((0, psdReader_1.readUint32)(reader))
          throw new Error("filterEffects: 64 bit length is not supported");
        const length = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + length;
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        const effectVersion = (0, psdReader_1.readInt32)(reader);
        if (effectVersion !== 1)
          throw new Error(`Invalid filterEffect version ${effectVersion}`);
        if ((0, psdReader_1.readUint32)(reader))
          throw new Error("filterEffect: 64 bit length is not supported");
        (0, psdReader_1.readUint32)(reader);
        const top = (0, psdReader_1.readInt32)(reader);
        const left = (0, psdReader_1.readInt32)(reader);
        const bottom = (0, psdReader_1.readInt32)(reader);
        const right = (0, psdReader_1.readInt32)(reader);
        const depth = (0, psdReader_1.readInt32)(reader);
        const maxChannels = (0, psdReader_1.readInt32)(reader);
        const channels = [];
        for (let i2 = 0; i2 < maxChannels + 2; i2++) {
          const exists = (0, psdReader_1.readInt32)(reader);
          if (exists) {
            if ((0, psdReader_1.readUint32)(reader))
              throw new Error("filterEffect: 64 bit length is not supported");
            const channelLength = (0, psdReader_1.readUint32)(reader);
            if (!channelLength)
              throw new Error("filterEffect: Empty channel");
            const compressionMode = (0, psdReader_1.readUint16)(reader);
            const data = (0, psdReader_1.readBytes)(reader, channelLength - 2);
            channels.push({ compressionMode, data });
          } else {
            channels.push(void 0);
          }
        }
        target.filterEffectsMasks.push({ id, top, left, bottom, right, depth, channels });
        if (reader.offset < end && (0, psdReader_1.readUint8)(reader)) {
          const top2 = (0, psdReader_1.readInt32)(reader);
          const left2 = (0, psdReader_1.readInt32)(reader);
          const bottom2 = (0, psdReader_1.readInt32)(reader);
          const right2 = (0, psdReader_1.readInt32)(reader);
          if ((0, psdReader_1.readUint32)(reader))
            throw new Error("filterEffect: 64 bit length is not supported");
          const extraLength = (0, psdReader_1.readUint32)(reader);
          const compressionMode = (0, psdReader_1.readUint16)(reader);
          const data = (0, psdReader_1.readBytes)(reader, extraLength - 2);
          target.filterEffectsMasks[target.filterEffectsMasks.length - 1].extra = { top: top2, left: left2, bottom: bottom2, right: right2, compressionMode, data };
        }
        reader.offset = end;
        let len = length;
        while (len % 4) {
          reader.offset++;
          len++;
        }
      }
    }, (writer, target) => {
      var _a2;
      (0, psdWriter_1.writeInt32)(writer, 3);
      for (const mask of target.filterEffectsMasks) {
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, 0);
        const lengthOffset = writer.offset;
        (0, psdWriter_1.writePascalString)(writer, mask.id, 1);
        (0, psdWriter_1.writeInt32)(writer, 1);
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, 0);
        const length2Offset = writer.offset;
        (0, psdWriter_1.writeInt32)(writer, mask.top);
        (0, psdWriter_1.writeInt32)(writer, mask.left);
        (0, psdWriter_1.writeInt32)(writer, mask.bottom);
        (0, psdWriter_1.writeInt32)(writer, mask.right);
        (0, psdWriter_1.writeInt32)(writer, mask.depth);
        const maxChannels = Math.max(0, mask.channels.length - 2);
        (0, psdWriter_1.writeInt32)(writer, maxChannels);
        for (let i2 = 0; i2 < maxChannels + 2; i2++) {
          const channel = mask.channels[i2];
          (0, psdWriter_1.writeInt32)(writer, channel ? 1 : 0);
          if (channel) {
            (0, psdWriter_1.writeUint32)(writer, 0);
            (0, psdWriter_1.writeUint32)(writer, channel.data.length + 2);
            (0, psdWriter_1.writeUint16)(writer, channel.compressionMode);
            (0, psdWriter_1.writeBytes)(writer, channel.data);
          }
        }
        writer.view.setUint32(length2Offset - 4, writer.offset - length2Offset, false);
        const extra = (_a2 = target.filterEffectsMasks[target.filterEffectsMasks.length - 1]) === null || _a2 === void 0 ? void 0 : _a2.extra;
        if (extra) {
          (0, psdWriter_1.writeUint8)(writer, 1);
          (0, psdWriter_1.writeInt32)(writer, extra.top);
          (0, psdWriter_1.writeInt32)(writer, extra.left);
          (0, psdWriter_1.writeInt32)(writer, extra.bottom);
          (0, psdWriter_1.writeInt32)(writer, extra.right);
          (0, psdWriter_1.writeUint32)(writer, 0);
          (0, psdWriter_1.writeUint32)(writer, extra.data.byteLength + 2);
          (0, psdWriter_1.writeUint16)(writer, extra.compressionMode);
          (0, psdWriter_1.writeBytes)(writer, extra.data);
        }
        let length = writer.offset - lengthOffset;
        writer.view.setUint32(lengthOffset - 4, length, false);
        while (length % 4) {
          (0, psdWriter_1.writeZeros)(writer, 1);
          length++;
        }
      }
    });
    addHandlerAlias("FXid", "FEid");
    addHandler("FMsk", hasKey("filterMask"), (reader, target) => {
      target.filterMask = {
        colorSpace: (0, psdReader_1.readColor)(reader),
        opacity: (0, psdReader_1.readUint16)(reader) / 255
      };
    }, (writer, target) => {
      var _a2;
      (0, psdWriter_1.writeColor)(writer, target.filterMask.colorSpace);
      (0, psdWriter_1.writeUint16)(writer, (0, helpers_1.clamp)((_a2 = target.filterMask.opacity) !== null && _a2 !== void 0 ? _a2 : 1, 0, 1) * 255);
    });
    addHandler(
      "artd",
      // document-wide artboard info
      // document-wide artboard info
      (target) => target.artboards !== void 0,
      (reader, target, left) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.artboards = {
          count: desc["Cnt "],
          autoExpandOffset: { horizontal: desc.autoExpandOffset.Hrzn, vertical: desc.autoExpandOffset.Vrtc },
          origin: { horizontal: desc.origin.Hrzn, vertical: desc.origin.Vrtc },
          autoExpandEnabled: desc.autoExpandEnabled,
          autoNestEnabled: desc.autoNestEnabled,
          autoPositionEnabled: desc.autoPositionEnabled,
          shrinkwrapOnSaveEnabled: !!desc.shrinkwrapOnSaveEnabled,
          docDefaultNewArtboardBackgroundColor: (0, descriptor_1.parseColor)(desc.docDefaultNewArtboardBackgroundColor),
          docDefaultNewArtboardBackgroundType: desc.docDefaultNewArtboardBackgroundType
        };
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        var _a2, _b2, _c, _d, _e;
        const artb = target.artboards;
        const desc = {
          "Cnt ": artb.count,
          autoExpandOffset: artb.autoExpandOffset ? { Hrzn: artb.autoExpandOffset.horizontal, Vrtc: artb.autoExpandOffset.vertical } : { Hrzn: 0, Vrtc: 0 },
          origin: artb.origin ? { Hrzn: artb.origin.horizontal, Vrtc: artb.origin.vertical } : { Hrzn: 0, Vrtc: 0 },
          autoExpandEnabled: (_a2 = artb.autoExpandEnabled) !== null && _a2 !== void 0 ? _a2 : true,
          autoNestEnabled: (_b2 = artb.autoNestEnabled) !== null && _b2 !== void 0 ? _b2 : true,
          autoPositionEnabled: (_c = artb.autoPositionEnabled) !== null && _c !== void 0 ? _c : true,
          shrinkwrapOnSaveEnabled: (_d = artb.shrinkwrapOnSaveEnabled) !== null && _d !== void 0 ? _d : true,
          docDefaultNewArtboardBackgroundColor: (0, descriptor_1.serializeColor)(artb.docDefaultNewArtboardBackgroundColor),
          docDefaultNewArtboardBackgroundType: (_e = artb.docDefaultNewArtboardBackgroundType) !== null && _e !== void 0 ? _e : 1
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "artd");
      }
    );
    function hasMultiEffects(effects) {
      return Object.keys(effects).map((key) => effects[key]).some((v) => Array.isArray(v) && v.length > 1);
    }
    addHandler("lfx2", (target) => target.effects !== void 0 && !hasMultiEffects(target.effects), (reader, target, left) => {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 0)
        throw new Error(`Invalid lfx2 version`);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.effects = (0, descriptor_1.parseEffects)(desc, !!reader.logMissingFeatures);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target, _, options) => {
      const desc = (0, descriptor_1.serializeEffects)(target.effects, !!options.logMissingFeatures, true);
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("cinf", hasKey("compositorUsed"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      function enumValue(desc2) {
        return desc2.split(".")[1];
      }
      target.compositorUsed = {
        description: desc.description,
        reason: desc.reason,
        engine: enumValue(desc.Engn)
      };
      if (desc.Vrsn)
        target.compositorUsed.version = desc.Vrsn;
      if (desc.psVersion)
        target.compositorUsed.photoshopVersion = desc.psVersion;
      if (desc.enableCompCore)
        target.compositorUsed.enableCompCore = enumValue(desc.enableCompCore);
      if (desc.enableCompCoreGPU)
        target.compositorUsed.enableCompCoreGPU = enumValue(desc.enableCompCoreGPU);
      if (desc.enableCompCoreThreads)
        target.compositorUsed.enableCompCoreThreads = enumValue(desc.enableCompCoreThreads);
      if (desc.compCoreSupport)
        target.compositorUsed.compCoreSupport = enumValue(desc.compCoreSupport);
      if (desc.compCoreGPUSupport)
        target.compositorUsed.compCoreGPUSupport = enumValue(desc.compCoreGPUSupport);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const cinf = target.compositorUsed;
      const desc = {
        Vrsn: cinf.version || { major: 1, minor: 0, fix: 0 }
      };
      if (cinf.photoshopVersion)
        desc.psVersion = cinf.photoshopVersion;
      desc.description = cinf.description;
      desc.reason = cinf.reason;
      desc.Engn = `Engn.${cinf.engine}`;
      if (cinf.enableCompCore)
        desc.enableCompCore = `enable.${cinf.enableCompCore}`;
      if (cinf.enableCompCoreGPU)
        desc.enableCompCoreGPU = `enable.${cinf.enableCompCoreGPU}`;
      if (cinf.enableCompCoreThreads)
        desc.enableCompCoreThreads = `enable.${cinf.enableCompCoreThreads}`;
      if (cinf.compCoreSupport)
        desc.compCoreSupport = `reason.${cinf.compCoreSupport}`;
      if (cinf.compCoreGPUSupport)
        desc.compCoreGPUSupport = `reason.${cinf.compCoreGPUSupport}`;
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("extn", (target) => target._extn !== void 0, (reader, target) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if (helpers_1.MOCK_HANDLERS)
        target._extn = desc;
    }, (writer, target) => {
      if (helpers_1.MOCK_HANDLERS)
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", target._extn);
    });
    addHandler("iOpa", hasKey("fillOpacity"), (reader, target) => {
      target.fillOpacity = (0, psdReader_1.readUint8)(reader) / 255;
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.fillOpacity * 255);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("brst", hasKey("channelBlendingRestrictions"), (reader, target, left) => {
      target.channelBlendingRestrictions = [];
      while (left() > 4) {
        target.channelBlendingRestrictions.push((0, psdReader_1.readInt32)(reader));
      }
    }, (writer, target) => {
      for (const channel of target.channelBlendingRestrictions) {
        (0, psdWriter_1.writeInt32)(writer, channel);
      }
    });
    addHandler("tsly", hasKey("transparencyShapesLayer"), (reader, target) => {
      target.transparencyShapesLayer = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.transparencyShapesLayer ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
  }
});

// node_modules/ag-psd/dist/psdWriter.js
var require_psdWriter = __commonJS({
  "node_modules/ag-psd/dist/psdWriter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createWriter = createWriter;
    exports.getWriterBuffer = getWriterBuffer;
    exports.getWriterBufferNoCopy = getWriterBufferNoCopy;
    exports.writeUint8 = writeUint8;
    exports.writeInt16 = writeInt16;
    exports.writeUint16 = writeUint16;
    exports.writeUint16LE = writeUint16LE;
    exports.writeInt32 = writeInt32;
    exports.writeInt32LE = writeInt32LE;
    exports.writeUint32 = writeUint32;
    exports.writeFloat32 = writeFloat32;
    exports.writeFloat64 = writeFloat64;
    exports.writeFixedPoint32 = writeFixedPoint32;
    exports.writeFixedPointPath32 = writeFixedPointPath32;
    exports.writeBytes = writeBytes;
    exports.writeZeros = writeZeros;
    exports.writeSignature = writeSignature;
    exports.writeAsciiString = writeAsciiString;
    exports.writePascalString = writePascalString;
    exports.writeUnicodeStringWithoutLength = writeUnicodeStringWithoutLength;
    exports.writeUnicodeStringWithoutLengthLE = writeUnicodeStringWithoutLengthLE;
    exports.writeUnicodeString = writeUnicodeString;
    exports.writeUnicodeStringWithPadding = writeUnicodeStringWithPadding;
    exports.writeSection = writeSection;
    exports.writePsd = writePsd2;
    exports.writeColor = writeColor;
    exports.writePattern = writePattern;
    var helpers_1 = require_helpers();
    var additionalInfo_1 = require_additionalInfo();
    var imageResources_1 = require_imageResources();
    function createWriter(size = 4096) {
      const buffer = new ArrayBuffer(size);
      const view = new DataView(buffer);
      const offset = 0;
      return { buffer, view, offset, tempBuffer: void 0 };
    }
    function getWriterBuffer(writer) {
      return writer.buffer.slice(0, writer.offset);
    }
    function getWriterBufferNoCopy(writer) {
      return new Uint8Array(writer.buffer, 0, writer.offset);
    }
    function writeUint8(writer, value) {
      const offset = addSize(writer, 1);
      writer.view.setUint8(offset, value);
    }
    function writeInt16(writer, value) {
      const offset = addSize(writer, 2);
      writer.view.setInt16(offset, value, false);
    }
    function writeUint16(writer, value) {
      const offset = addSize(writer, 2);
      writer.view.setUint16(offset, value, false);
    }
    function writeUint16LE(writer, value) {
      const offset = addSize(writer, 2);
      writer.view.setUint16(offset, value, true);
    }
    function writeInt32(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setInt32(offset, value, false);
    }
    function writeInt32LE(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setInt32(offset, value, true);
    }
    function writeUint32(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setUint32(offset, value, false);
    }
    function writeFloat32(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setFloat32(offset, value, false);
    }
    function writeFloat64(writer, value) {
      const offset = addSize(writer, 8);
      writer.view.setFloat64(offset, value, false);
    }
    function writeFixedPoint32(writer, value) {
      writeInt32(writer, value * (1 << 16));
    }
    function writeFixedPointPath32(writer, value) {
      writeInt32(writer, value * (1 << 24));
    }
    function writeBytes(writer, buffer) {
      if (buffer) {
        ensureSize(writer, writer.offset + buffer.length);
        const bytes = new Uint8Array(writer.buffer);
        bytes.set(buffer, writer.offset);
        writer.offset += buffer.length;
      }
    }
    function writeZeros(writer, count) {
      for (let i2 = 0; i2 < count; i2++) {
        writeUint8(writer, 0);
      }
    }
    function writeSignature(writer, signature) {
      if (signature.length !== 4)
        throw new Error(`Invalid signature: '${signature}'`);
      for (let i2 = 0; i2 < 4; i2++) {
        writeUint8(writer, signature.charCodeAt(i2));
      }
    }
    function writeAsciiString(writer, text) {
      for (let i2 = 0; i2 < text.length; i2++) {
        writeUint8(writer, text.charCodeAt(i2));
      }
    }
    function writePascalString(writer, text, padTo) {
      let length = text.length;
      if (length > 255)
        throw new Error(`String too long`);
      writeUint8(writer, length);
      for (let i2 = 0; i2 < length; i2++) {
        const code = text.charCodeAt(i2);
        writeUint8(writer, code < 128 ? code : "?".charCodeAt(0));
      }
      while (++length % padTo) {
        writeUint8(writer, 0);
      }
    }
    function writeUnicodeStringWithoutLength(writer, text) {
      for (let i2 = 0; i2 < text.length; i2++) {
        writeUint16(writer, text.charCodeAt(i2));
      }
    }
    function writeUnicodeStringWithoutLengthLE(writer, text) {
      for (let i2 = 0; i2 < text.length; i2++) {
        writeUint16LE(writer, text.charCodeAt(i2));
      }
    }
    function writeUnicodeString(writer, text) {
      writeUint32(writer, text.length);
      writeUnicodeStringWithoutLength(writer, text);
    }
    function writeUnicodeStringWithPadding(writer, text) {
      writeUint32(writer, text.length + 1);
      for (let i2 = 0; i2 < text.length; i2++) {
        writeUint16(writer, text.charCodeAt(i2));
      }
      writeUint16(writer, 0);
    }
    function getLargestLayerSize(layers = []) {
      let max2 = 0;
      for (const layer of layers) {
        const { width, height } = getLayerDimentions(layer);
        max2 = Math.max(max2, 2 * height + 2 * width * height);
        if (layer.mask) {
          const { width: width2, height: height2 } = getLayerDimentions(layer.mask);
          max2 = Math.max(max2, 2 * height2 + 2 * width2 * height2);
        }
        if (layer.realMask) {
          const { width: width2, height: height2 } = getLayerDimentions(layer.realMask);
          max2 = Math.max(max2, 2 * height2 + 2 * width2 * height2);
        }
        if (layer.children) {
          max2 = Math.max(max2, getLargestLayerSize(layer.children));
        }
      }
      return max2;
    }
    function writeSection(writer, round, func, writeTotalLength = false, large = false) {
      if (large)
        writeUint32(writer, 0);
      const offset = writer.offset;
      writeUint32(writer, 0);
      func();
      let length = writer.offset - offset - 4;
      let len = length;
      while (len % round) {
        writeUint8(writer, 0);
        len++;
      }
      if (writeTotalLength) {
        length = len;
      }
      writer.view.setUint32(offset, length, false);
    }
    function verifyBitCount(target) {
      var _a2;
      (_a2 = target.children) === null || _a2 === void 0 ? void 0 : _a2.forEach(verifyBitCount);
      const data = target.imageData;
      if (data && (data.data instanceof Uint32Array || data.data instanceof Uint16Array)) {
        throw new Error("imageData has incorrect bitDepth");
      }
      if ("mask" in target && target.mask) {
        const data2 = target.mask.imageData;
        if (data2 && (data2.data instanceof Uint32Array || data2.data instanceof Uint16Array)) {
          throw new Error("mask imageData has incorrect bitDepth");
        }
      }
    }
    function writePsd2(writer, psd, options = {}) {
      var _a2;
      if (!(+psd.width > 0 && +psd.height > 0))
        throw new Error("Invalid document size");
      if ((psd.width > 3e4 || psd.height > 3e4) && !options.psb)
        throw new Error("Document size is too large (max is 30000x30000, use PSB format instead)");
      const bitsPerChannel = (_a2 = psd.bitsPerChannel) !== null && _a2 !== void 0 ? _a2 : 8;
      if (bitsPerChannel !== 8)
        throw new Error("bitsPerChannel other than 8 are not supported for writing");
      verifyBitCount(psd);
      const imageResources = Object.assign({}, psd.imageResources);
      const opt = Object.assign(Object.assign({}, options), { layerIds: /* @__PURE__ */ new Set(), layerToId: /* @__PURE__ */ new Map() });
      if (opt.generateThumbnail) {
        imageResources.thumbnail = createThumbnail(psd);
      }
      let imageData = psd.imageData;
      if (!imageData && psd.canvas) {
        imageData = psd.canvas.getContext("2d").getImageData(0, 0, psd.canvas.width, psd.canvas.height);
      }
      if (imageData && (psd.width !== imageData.width || psd.height !== imageData.height))
        throw new Error("Document canvas must have the same size as document");
      const globalAlpha = !!imageData && (0, helpers_1.hasAlpha)(imageData);
      const maxBufferSize = Math.max(getLargestLayerSize(psd.children), 4 * 2 * psd.width * psd.height + 2 * psd.height);
      writer.tempBuffer = new Uint8Array(maxBufferSize);
      writeSignature(writer, "8BPS");
      writeUint16(writer, options.psb ? 2 : 1);
      writeZeros(writer, 6);
      writeUint16(writer, globalAlpha ? 4 : 3);
      writeUint32(writer, psd.height);
      writeUint32(writer, psd.width);
      writeUint16(writer, bitsPerChannel);
      writeUint16(
        writer,
        3
        /* ColorMode.RGB */
      );
      writeSection(writer, 1, () => {
        var _a3, _b2, _c;
        if (psd.palette) {
          for (let i2 = 0; i2 < 256; i2++)
            writeUint8(writer, ((_a3 = psd.palette[i2]) === null || _a3 === void 0 ? void 0 : _a3.r) || 0);
          for (let i2 = 0; i2 < 256; i2++)
            writeUint8(writer, ((_b2 = psd.palette[i2]) === null || _b2 === void 0 ? void 0 : _b2.g) || 0);
          for (let i2 = 0; i2 < 256; i2++)
            writeUint8(writer, ((_c = psd.palette[i2]) === null || _c === void 0 ? void 0 : _c.b) || 0);
        }
      });
      const layers = [];
      addChildren(layers, psd.children);
      if (!layers.length)
        layers.push({});
      imageResources.layersGroup = layers.map((l) => l.linkGroup || 0);
      imageResources.layerGroupsEnabledId = layers.map((l) => l.linkGroupEnabled == false ? 0 : 1);
      writeSection(writer, 1, () => {
        for (const handler of imageResources_1.resourceHandlers) {
          const has = handler.has(imageResources);
          const count = has === false ? 0 : has === true ? 1 : has;
          for (let i2 = 0; i2 < count; i2++) {
            writeSignature(writer, "8BIM");
            writeUint16(writer, handler.key);
            writePascalString(writer, "", 2);
            writeSection(writer, 2, () => handler.write(writer, imageResources, i2));
          }
        }
      });
      writeSection(writer, 2, () => {
        writeLayerInfo(writer, layers, psd, globalAlpha, opt);
        writeGlobalLayerMaskInfo(writer, psd.globalLayerMaskInfo);
        writeAdditionalLayerInfo(writer, psd, psd, opt);
      }, void 0, !!opt.psb);
      const channels = globalAlpha ? [0, 1, 2, 3] : [0, 1, 2];
      const width = imageData ? imageData.width : psd.width;
      const height = imageData ? imageData.height : psd.height;
      const data = { data: new Uint8Array(width * height * 4), width, height };
      writeUint16(
        writer,
        1
        /* Compression.RleCompressed */
      );
      if (helpers_1.RAW_IMAGE_DATA && psd.imageDataRaw) {
        console.log("writing raw image data");
        writeBytes(writer, psd.imageDataRaw);
      } else {
        if (imageData)
          data.data.set(new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength));
        if (globalAlpha) {
          const size = data.width * data.height * 4;
          const p = data.data;
          for (let i2 = 0; i2 < size; i2 += 4) {
            const pa = p[i2 + 3];
            if (pa != 0 && pa != 255) {
              const a = pa / 255;
              const ra = 255 * (1 - a);
              p[i2 + 0] = p[i2 + 0] * a + ra;
              p[i2 + 1] = p[i2 + 1] * a + ra;
              p[i2 + 2] = p[i2 + 2] * a + ra;
            }
          }
        }
        writeBytes(writer, (0, helpers_1.writeDataRLE)(writer.tempBuffer, data, channels, !!options.psb));
      }
    }
    function writeLayerInfo(writer, layers, psd, globalAlpha, options) {
      writeSection(writer, 4, () => {
        var _a2;
        writeInt16(writer, globalAlpha ? -layers.length : layers.length);
        const layersData = layers.map((l, i2) => getChannels(writer.tempBuffer, l, i2 === 0, options));
        for (const layerData of layersData) {
          const { layer, top, left, bottom, right, channels } = layerData;
          writeInt32(writer, top);
          writeInt32(writer, left);
          writeInt32(writer, bottom);
          writeInt32(writer, right);
          writeUint16(writer, channels.length);
          for (const c of channels) {
            writeInt16(writer, c.id);
            if (options.psb)
              writeUint32(writer, 0);
            writeUint32(writer, c.length);
          }
          writeSignature(writer, "8BIM");
          writeSignature(writer, helpers_1.fromBlendMode[layer.blendMode] || "norm");
          writeUint8(writer, Math.round((0, helpers_1.clamp)((_a2 = layer.opacity) !== null && _a2 !== void 0 ? _a2 : 1, 0, 1) * 255));
          writeUint8(writer, layer.clipping ? 1 : 0);
          let flags = 8;
          if (layer.transparencyProtected)
            flags |= 1;
          if (layer.hidden)
            flags |= 2;
          if (layer.vectorMask || layer.sectionDivider && layer.sectionDivider.type !== 0 || layer.adjustment) {
            flags |= 16;
          }
          if (layer.effectsOpen)
            flags |= 32;
          writeUint8(writer, flags);
          writeUint8(writer, 0);
          writeSection(writer, 1, () => {
            writeLayerMaskData(writer, layer, layerData);
            writeLayerBlendingRanges(writer, layer);
            writePascalString(writer, (layer.name || "").substring(0, 255), 4);
            writeAdditionalLayerInfo(writer, layer, psd, options);
          });
        }
        for (const layerData of layersData) {
          for (const channel of layerData.channels) {
            writeUint16(writer, channel.compression);
            if (channel.data) {
              writeBytes(writer, channel.data);
            }
          }
        }
      }, true, options.psb);
    }
    function writeLayerMaskData(writer, { mask, realMask }, layerData) {
      writeSection(writer, 1, () => {
        if (!mask && !realMask)
          return;
        let params = 0, flags = 0, realFlags = 0;
        if (mask) {
          if (mask.userMaskDensity !== void 0)
            params |= 1;
          if (mask.userMaskFeather !== void 0)
            params |= 2;
          if (mask.vectorMaskDensity !== void 0)
            params |= 4;
          if (mask.vectorMaskFeather !== void 0)
            params |= 8;
          if (mask.disabled)
            flags |= 2;
          if (mask.positionRelativeToLayer)
            flags |= 1;
          if (mask.fromVectorData)
            flags |= 8;
          if (params)
            flags |= 16;
        }
        const m = layerData.mask || {};
        writeInt32(writer, m.top || 0);
        writeInt32(writer, m.left || 0);
        writeInt32(writer, m.bottom || 0);
        writeInt32(writer, m.right || 0);
        writeUint8(writer, mask && mask.defaultColor || 0);
        writeUint8(writer, flags);
        if (realMask) {
          if (realMask.disabled)
            realFlags |= 2;
          if (realMask.positionRelativeToLayer)
            realFlags |= 1;
          if (realMask.fromVectorData)
            realFlags |= 8;
          const r = layerData.realMask || {};
          writeUint8(writer, realFlags);
          writeUint8(writer, realMask.defaultColor || 0);
          writeInt32(writer, r.top || 0);
          writeInt32(writer, r.left || 0);
          writeInt32(writer, r.bottom || 0);
          writeInt32(writer, r.right || 0);
        }
        if (params && mask) {
          writeUint8(writer, params);
          if (mask.userMaskDensity !== void 0)
            writeUint8(writer, Math.round(mask.userMaskDensity * 255));
          if (mask.userMaskFeather !== void 0)
            writeFloat64(writer, mask.userMaskFeather);
          if (mask.vectorMaskDensity !== void 0)
            writeUint8(writer, Math.round(mask.vectorMaskDensity * 255));
          if (mask.vectorMaskFeather !== void 0)
            writeFloat64(writer, mask.vectorMaskFeather);
        }
        writeZeros(writer, 2);
      });
    }
    function writerBlendingRange(writer, range) {
      writeUint8(writer, range[0]);
      writeUint8(writer, range[1]);
      writeUint8(writer, range[2]);
      writeUint8(writer, range[3]);
    }
    function writeLayerBlendingRanges(writer, layer) {
      writeSection(writer, 1, () => {
        const ranges = layer.blendingRanges;
        if (ranges) {
          writerBlendingRange(writer, ranges.compositeGrayBlendSource);
          writerBlendingRange(writer, ranges.compositeGraphBlendDestinationRange);
          for (const r of ranges.ranges) {
            writerBlendingRange(writer, r.sourceRange);
            writerBlendingRange(writer, r.destRange);
          }
        }
      });
    }
    function writeGlobalLayerMaskInfo(writer, info) {
      writeSection(writer, 1, () => {
        if (info) {
          writeUint16(writer, info.overlayColorSpace);
          writeUint16(writer, info.colorSpace1);
          writeUint16(writer, info.colorSpace2);
          writeUint16(writer, info.colorSpace3);
          writeUint16(writer, info.colorSpace4);
          writeUint16(writer, Math.round(info.opacity * 255));
          writeUint8(writer, info.kind);
          writeZeros(writer, 3);
        }
      });
    }
    function writeAdditionalLayerInfo(writer, target, psd, options) {
      for (const handler of additionalInfo_1.infoHandlers) {
        let key = handler.key;
        if (key === "Txt2" && options.invalidateTextLayers)
          continue;
        if (key === "vmsk" && options.psb)
          key = "vsms";
        if (handler.has(target)) {
          const large = options.psb && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1;
          const writeTotalLength = key !== "Txt2" && key !== "cinf" && key !== "extn" && key !== "CAI " && key !== "OCIO";
          const fourBytes = key === "levl" || key === "Txt2" || key === "luni" || key === "vmsk" || key === "artb" || key === "artd" || key === "vogk" || key === "SoLd" || key === "lnk2" || key === "vscg" || key === "vsms" || key === "GdFl" || key === "lmfx" || key === "lrFX" || key === "cinf" || key === "PlLd" || key === "Anno" || key === "CAI " || key === "OCIO" || key === "GenI" || key === "FEid" || key === "curv" || key === "CgEd" || key === "vibA" || key === "blwh" || key === "grdm";
          writeSignature(writer, large ? "8B64" : "8BIM");
          writeSignature(writer, key);
          writeSection(writer, fourBytes ? 4 : 2, () => {
            handler.write(writer, target, psd, options);
          }, writeTotalLength, large);
        }
      }
    }
    function addChildren(layers, children) {
      if (!children)
        return;
      for (const c of children) {
        if (c.children && c.canvas)
          throw new Error(`Invalid layer, cannot have both 'canvas' and 'children' properties`);
        if (c.children && c.imageData)
          throw new Error(`Invalid layer, cannot have both 'imageData' and 'children' properties`);
        if (c.children) {
          layers.push({
            name: "</Layer group>",
            sectionDivider: {
              type: 3
            }
            // blendingRanges: children[0].blendingRanges,
            // nameSource: 'lset',
            // id: layerIds.shift(),
            // protected: {
            // 	transparency: false,
            // 	composite: false,
            // 	position: false,
            // },
            // layerColor: 'red',
            // timestamp: timestamps.shift(),
            // referencePoint: { x: 0, y: 0 },
          });
          addChildren(layers, c.children);
          layers.push(Object.assign(Object.assign({}, c), { blendMode: c.blendMode === "pass through" ? "normal" : c.blendMode, sectionDivider: {
            type: c.opened === false ? 2 : 1,
            key: helpers_1.fromBlendMode[c.blendMode] || "pass",
            subType: 0
          } }));
        } else {
          layers.push(Object.assign({}, c));
        }
      }
    }
    function resizeBuffer(writer, size) {
      let newLength = writer.buffer.byteLength;
      do {
        newLength *= 2;
      } while (size > newLength);
      const newBuffer = new ArrayBuffer(newLength);
      const newBytes = new Uint8Array(newBuffer);
      const oldBytes = new Uint8Array(writer.buffer);
      newBytes.set(oldBytes);
      writer.buffer = newBuffer;
      writer.view = new DataView(writer.buffer);
    }
    function ensureSize(writer, size) {
      if (size > writer.buffer.byteLength) {
        resizeBuffer(writer, size);
      }
    }
    function addSize(writer, size) {
      const offset = writer.offset;
      ensureSize(writer, writer.offset += size);
      return offset;
    }
    function createThumbnail(psd) {
      const canvas = (0, helpers_1.createCanvas)(10, 10);
      let scale = 1;
      if (psd.width > psd.height) {
        canvas.width = 160;
        canvas.height = Math.floor(psd.height * (canvas.width / psd.width));
        scale = canvas.width / psd.width;
      } else {
        canvas.height = 160;
        canvas.width = Math.floor(psd.width * (canvas.height / psd.height));
        scale = canvas.height / psd.height;
      }
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      if (psd.imageData) {
        context.drawImage((0, helpers_1.imageDataToCanvas)(psd.imageData), 0, 0);
      } else if (psd.canvas) {
        context.drawImage(psd.canvas, 0, 0);
      }
      return canvas;
    }
    function getMaskChannels(tempBuffer, layerData, layer, mask, options, realMask) {
      let top = mask.top | 0;
      let left = mask.left | 0;
      let right = mask.right | 0;
      let bottom = mask.bottom | 0;
      let { width, height } = getLayerDimentions(mask);
      let imageData = mask.imageData;
      if (!imageData && mask.canvas && width && height) {
        imageData = mask.canvas.getContext("2d").getImageData(0, 0, width, height);
      }
      if (imageData && (imageData.width !== width || imageData.height !== height)) {
        throw new Error("Invalid imageData dimentions");
      }
      right = left + width;
      bottom = top + height;
      let buffer;
      let compression;
      if (helpers_1.RAW_IMAGE_DATA && layer[realMask ? "realMaskDataRaw" : "maskDataRaw"]) {
        buffer = layer[realMask ? "realMaskDataRaw" : "maskDataRaw"];
        compression = layer[realMask ? "realMaskDataRawCompression" : "maskDataRawCompression"];
      } else if (!imageData) {
        buffer = new Uint8Array(0);
        compression = 1;
      } else if (options.compress) {
        buffer = (0, helpers_1.writeDataZipWithoutPrediction)(imageData, [0]);
        compression = 2;
      } else {
        buffer = (0, helpers_1.writeDataRLE)(tempBuffer, imageData, [0], !!options.psb);
        compression = 1;
      }
      layerData.channels.push({ id: realMask ? -3 : -2, compression, data: buffer, length: 2 + buffer.length });
      layerData[realMask ? "realMask" : "mask"] = { top, left, right, bottom };
    }
    function bounds(obj) {
      return obj ? {
        top: obj.top || 0,
        left: obj.left || 0,
        right: obj.right || 0,
        bottom: obj.bottom || 0
      } : void 0;
    }
    function getChannels(tempBuffer, layer, background, options) {
      if (layer.rawData) {
        return Object.assign(Object.assign({ layer, channels: layer.rawData.channels.map((c) => {
          var _a2, _b2;
          return Object.assign(Object.assign({}, c), { length: 2 + ((_b2 = (_a2 = c.data) === null || _a2 === void 0 ? void 0 : _a2.byteLength) !== null && _b2 !== void 0 ? _b2 : 0) });
        }) }, bounds(layer)), { mask: bounds(layer.mask), realMask: bounds(layer.realMask) });
      }
      const layerData = getLayerChannels(tempBuffer, layer, background, options);
      if (layer.mask)
        getMaskChannels(tempBuffer, layerData, layer, layer.mask, options, false);
      if (layer.realMask)
        getMaskChannels(tempBuffer, layerData, layer, layer.realMask, options, true);
      return layerData;
    }
    function getLayerDimentions({ canvas, imageData }) {
      var _a2, _b2, _c, _d;
      const width = (_b2 = (_a2 = imageData === null || imageData === void 0 ? void 0 : imageData.width) !== null && _a2 !== void 0 ? _a2 : canvas === null || canvas === void 0 ? void 0 : canvas.width) !== null && _b2 !== void 0 ? _b2 : 0;
      const height = (_d = (_c = imageData === null || imageData === void 0 ? void 0 : imageData.height) !== null && _c !== void 0 ? _c : canvas === null || canvas === void 0 ? void 0 : canvas.height) !== null && _d !== void 0 ? _d : 0;
      return { width, height };
    }
    function cropImageData(data, left, top, width, height) {
      if (data.data instanceof Uint32Array || data.data instanceof Uint16Array) {
        throw new Error("imageData has incorrect bit depth");
      }
      const croppedData = (0, helpers_1.createImageData)(width, height);
      const srcData = data.data;
      const dstData = croppedData.data;
      for (let y = 0; y < height; y++) {
        for (let x2 = 0; x2 < width; x2++) {
          let src = (x2 + left + (y + top) * data.width) * 4;
          let dst = (x2 + y * width) * 4;
          dstData[dst] = srcData[src];
          dstData[dst + 1] = srcData[src + 1];
          dstData[dst + 2] = srcData[src + 2];
          dstData[dst + 3] = srcData[src + 3];
        }
      }
      return croppedData;
    }
    function getLayerChannels(tempBuffer, layer, background, options) {
      var _a2;
      let top = layer.top | 0;
      let left = layer.left | 0;
      let right = layer.right | 0;
      let bottom = layer.bottom | 0;
      let channels = [
        { id: -1, compression: 0, data: void 0, length: 2 },
        { id: 0, compression: 0, data: void 0, length: 2 },
        { id: 1, compression: 0, data: void 0, length: 2 },
        { id: 2, compression: 0, data: void 0, length: 2 }
      ];
      let { width, height } = getLayerDimentions(layer);
      if (!(layer.canvas || layer.imageData) || !width || !height) {
        right = left;
        bottom = top;
        return { layer, top, left, right, bottom, channels };
      }
      right = left + width;
      bottom = top + height;
      let imageData = layer.imageData || layer.canvas.getContext("2d").getImageData(0, 0, width, height);
      if (options.trimImageData) {
        const trimmed = trimData(imageData);
        if (trimmed.left !== 0 || trimmed.top !== 0 || trimmed.right !== imageData.width || trimmed.bottom !== imageData.height) {
          left += trimmed.left;
          top += trimmed.top;
          right -= imageData.width - trimmed.right;
          bottom -= imageData.height - trimmed.bottom;
          width = right - left;
          height = bottom - top;
          if (!width || !height)
            return { layer, top, left, right, bottom, channels };
          imageData = cropImageData(imageData, trimmed.left, trimmed.top, width, height);
        }
      }
      const channelIds = [
        0,
        1,
        2
      ];
      if (!background || options.noBackground || layer.mask || (0, helpers_1.hasAlpha)(imageData) || helpers_1.RAW_IMAGE_DATA && ((_a2 = layer.imageDataRaw) === null || _a2 === void 0 ? void 0 : _a2["-1"])) {
        channelIds.unshift(
          -1
          /* ChannelID.Transparency */
        );
      }
      channels = channelIds.map((id) => {
        const offset = (0, helpers_1.offsetForChannel)(id, false);
        let data;
        let compression;
        if (helpers_1.RAW_IMAGE_DATA && layer.imageDataRaw) {
          data = layer.imageDataRaw[id];
          compression = layer.imageDataRawCompression[id];
        } else if (options.compress) {
          data = (0, helpers_1.writeDataZipWithoutPrediction)(imageData, [offset]);
          compression = 2;
        } else {
          data = (0, helpers_1.writeDataRLE)(tempBuffer, imageData, [offset], !!options.psb);
          compression = 1;
        }
        return { id, compression, data, length: 2 + data.length };
      });
      return { layer, top, left, right, bottom, channels };
    }
    function isRowEmpty({ data, width }, y, left, right) {
      const start = (y * width + left) * 4 + 3 | 0;
      const end = start + (right - left) * 4 | 0;
      for (let i2 = start; i2 < end; i2 = i2 + 4 | 0) {
        if (data[i2] !== 0) {
          return false;
        }
      }
      return true;
    }
    function isColEmpty({ data, width }, x2, top, bottom) {
      const stride = width * 4 | 0;
      const start = top * stride + x2 * 4 + 3 | 0;
      for (let y = top, i2 = start; y < bottom; y++, i2 = i2 + stride | 0) {
        if (data[i2] !== 0) {
          return false;
        }
      }
      return true;
    }
    function trimData(data) {
      let top = 0;
      let left = 0;
      let right = data.width;
      let bottom = data.height;
      while (top < bottom && isRowEmpty(data, top, left, right))
        top++;
      while (bottom > top && isRowEmpty(data, bottom - 1, left, right))
        bottom--;
      while (left < right && isColEmpty(data, left, top, bottom))
        left++;
      while (right > left && isColEmpty(data, right - 1, top, bottom))
        right--;
      return { top, left, right, bottom };
    }
    function writeColor(writer, color) {
      if (!color) {
        writeUint16(
          writer,
          0
          /* ColorSpace.RGB */
        );
        writeZeros(writer, 8);
      } else if ("r" in color) {
        writeUint16(
          writer,
          0
          /* ColorSpace.RGB */
        );
        writeUint16(writer, Math.round(color.r * 257));
        writeUint16(writer, Math.round(color.g * 257));
        writeUint16(writer, Math.round(color.b * 257));
        writeUint16(writer, 0);
      } else if ("fr" in color) {
        writeUint16(
          writer,
          0
          /* ColorSpace.RGB */
        );
        writeUint16(writer, Math.round(color.fr * 255 * 257));
        writeUint16(writer, Math.round(color.fg * 255 * 257));
        writeUint16(writer, Math.round(color.fb * 255 * 257));
        writeUint16(writer, 0);
      } else if ("l" in color) {
        writeUint16(
          writer,
          7
          /* ColorSpace.Lab */
        );
        writeInt16(writer, Math.round(color.l * 1e4));
        writeInt16(writer, Math.round(color.a < 0 ? color.a * 12800 : color.a * 12700));
        writeInt16(writer, Math.round(color.b < 0 ? color.b * 12800 : color.b * 12700));
        writeUint16(writer, 0);
      } else if ("h" in color) {
        writeUint16(
          writer,
          1
          /* ColorSpace.HSB */
        );
        writeUint16(writer, Math.round(color.h * 65535));
        writeUint16(writer, Math.round(color.s * 65535));
        writeUint16(writer, Math.round(color.b * 65535));
        writeUint16(writer, 0);
      } else if ("c" in color) {
        writeUint16(
          writer,
          2
          /* ColorSpace.CMYK */
        );
        writeUint16(writer, Math.round(color.c * 257));
        writeUint16(writer, Math.round(color.m * 257));
        writeUint16(writer, Math.round(color.y * 257));
        writeUint16(writer, Math.round(color.k * 257));
      } else {
        writeUint16(
          writer,
          8
          /* ColorSpace.Grayscale */
        );
        writeUint16(writer, Math.round(color.k * 1e4 / 255));
        writeZeros(writer, 6);
      }
    }
    function writePattern(writer, pattern) {
      const width = pattern.bounds.w;
      const height = pattern.bounds.h;
      const pixelData = { width, height, data: pattern.data };
      writeUint32(writer, 0);
      const pattsOffset = writer.offset;
      writeUint32(writer, 1);
      writeUint32(
        writer,
        3
        /* ColorMode.RGB */
      );
      writeInt16(writer, pattern.x);
      writeInt16(writer, pattern.y);
      writeUnicodeString(writer, pattern.name + "\0");
      writePascalString(writer, pattern.id, 1);
      writeUint32(writer, 3);
      writeUint32(writer, 0);
      const vlOffset = writer.offset;
      const top = pattern.bounds.y;
      const left = pattern.bounds.x;
      const bottom = top + height;
      const right = left + width;
      writeUint32(writer, top);
      writeUint32(writer, left);
      writeUint32(writer, bottom);
      writeUint32(writer, right);
      writeUint32(writer, 24);
      for (let i2 = 0; i2 < 24 + 2; i2++) {
        const offset = i2 < 3 ? i2 : i2 === 25 ? 3 : -1;
        if (offset < 0) {
          writeUint32(writer, 0);
          continue;
        }
        const buffer = new Uint8Array(width * height + 2 * height + 2 * width + 16);
        const data = (0, helpers_1.writeDataRLE)(buffer, pixelData, [offset], false);
        writeUint32(writer, 1);
        writeUint32(writer, data.length + 4 + 16 + 2 + 1);
        writeUint32(writer, 8);
        writeUint32(writer, top);
        writeUint32(writer, left);
        writeUint32(writer, bottom);
        writeUint32(writer, right);
        writeUint16(writer, 8);
        writeUint8(writer, 1);
        writeBytes(writer, data);
      }
      const vlLength = writer.offset - vlOffset;
      let pattsLength = writer.offset - pattsOffset;
      while (pattsLength % 4) {
        writeZeros(writer, 1);
        pattsLength++;
      }
      writer.view.setUint32(vlOffset - 4, vlLength, false);
      writer.view.setUint32(pattsOffset - 4, pattsLength, false);
    }
  }
});

// node_modules/ag-psd/dist/abr.js
var require_abr = __commonJS({
  "node_modules/ag-psd/dist/abr.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readAbr = readAbr;
    var descriptor_1 = require_descriptor();
    var psdReader_1 = require_psdReader();
    var dynamicsControl = ["off", "fade", "pen pressure", "pen tilt", "stylus wheel", "initial direction", "direction", "initial rotation", "rotation"];
    var dynamicBrushShapeShapes = ["round point", "round blunt", "round curve", "round angle", "round fan", "flat point", "flat blunt", "flat curve", "flat angle", "flat fan"];
    var tipsBrushShapeShapes = ["erodible point", "erodible flat", "erodible round", "erodible square", "erodible triangle", "custom"];
    var toBrushType = {
      _: "brush",
      MixB: "mixer brush",
      SmTl: "smudge brush"
      // PbTl
      // ErTl
    };
    function parseDynamics(desc) {
      return {
        control: dynamicsControl[desc.bVTy],
        steps: desc.fStp,
        jitter: (0, descriptor_1.parsePercent)(desc.jitter),
        minimum: (0, descriptor_1.parsePercent)(desc["Mnm "])
      };
    }
    function parseBrushShape(desc) {
      switch (desc._classID) {
        case "computedBrush": {
          return {
            type: "computed",
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            roundness: (0, descriptor_1.parsePercent)(desc.Rndn),
            spacingOn: desc.Intr,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            flipX: desc.flipX,
            flipY: desc.flipY,
            hardness: (0, descriptor_1.parsePercent)(desc.Hrdn)
          };
        }
        case "sampledBrush": {
          return {
            type: "sampled",
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            roundness: (0, descriptor_1.parsePercent)(desc.Rndn),
            spacingOn: desc.Intr,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            flipX: desc.flipX,
            flipY: desc.flipY,
            name: desc["Nm  "],
            sampledData: desc.sampledData
          };
        }
        case "dBrush":
          return {
            type: "dynamic",
            shape: dynamicBrushShapeShapes[desc["Shp "]],
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            density: (0, descriptor_1.parsePercent)(desc.Dnst),
            length: (0, descriptor_1.parsePercent)(desc.Lngt),
            clumping: (0, descriptor_1.parsePercent)(desc.clumping),
            thickness: (0, descriptor_1.parsePercent)(desc.thickness),
            stiffness: (0, descriptor_1.parsePercent)(desc.stiffness),
            physics: desc.physics,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            spacingOn: desc.Intr,
            flipX: desc.flipX,
            flipY: desc.flipY
          };
        case "dTips": {
          return Object.assign(Object.assign({
            type: "tips",
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            shape: dynamicBrushShapeShapes[desc["Shp "]],
            physics: desc.physics,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            spacingOn: desc.Intr,
            flipX: desc.flipX,
            flipY: desc.flipY,
            // tips:
            tipsType: tipsBrushShapeShapes[desc.dtipsType],
            tipsLengthRatio: (0, descriptor_1.parsePercent)(desc.dtipsLengthRatio),
            tipsHardness: (0, descriptor_1.parsePercent)(desc.dtipsHardness)
          }, desc.dtipsGridSize && desc.dtipsErodibleTipHeightMap ? {
            tipsGridSize: desc.dtipsGridSize,
            tipsErodibleTipHeightMap: parseHeightmap(desc.dtipsErodibleTipHeightMap)
          } : {}), {
            // airbrush
            tipsAirbrushCutoffAngle: desc.dtipsAirbrushCutoffAngle,
            tipsAirbrushGranularity: (0, descriptor_1.parsePercent)(desc.dtipsAirbrushGranularity),
            tipsAirbrushStreakiness: (0, descriptor_1.parsePercent)(desc.dtipsAirbrushStreakiness),
            tipsAirbrushSplatSize: (0, descriptor_1.parsePercent)(desc.dtipsAirbrushSplatSize),
            tipsAirbrushSplatCount: desc.dtipsAirbrushSplatCount
          });
        }
        default:
          throw new Error(`Unknown brush classId: ${desc._classID}`);
      }
    }
    function parseHeightmap(array) {
      const result = [];
      for (let i2 = 0; i2 < array.byteLength; i2++) {
        result.push(array[i2]);
      }
      return result;
    }
    function readAbr(buffer, options = {}) {
      var _a2, _b2, _c, _d;
      const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const version = (0, psdReader_1.readInt16)(reader);
      const samples = [];
      const brushes = [];
      const patterns = [];
      if (version === 1 || version === 2) {
        throw new Error(`Unsupported ABR version (${version})`);
      } else if (version === 6 || version === 7 || version === 9 || version === 10) {
        const minorVersion = (0, psdReader_1.readInt16)(reader);
        if (minorVersion !== 1 && minorVersion !== 2)
          throw new Error("Unsupported ABR minor version");
        while (reader.offset < reader.view.byteLength) {
          (0, psdReader_1.checkSignature)(reader, "8BIM");
          const type = (0, psdReader_1.readSignature)(reader);
          let size = (0, psdReader_1.readUint32)(reader);
          const end = reader.offset + size;
          switch (type) {
            case "samp": {
              while (reader.offset < end) {
                let brushLength = (0, psdReader_1.readUint32)(reader);
                while (brushLength & 3)
                  brushLength++;
                const brushEnd = reader.offset + brushLength;
                const id = (0, psdReader_1.readPascalString)(reader, 1);
                (0, psdReader_1.skipBytes)(reader, minorVersion === 1 ? 10 : 264);
                const y = (0, psdReader_1.readInt32)(reader);
                const x2 = (0, psdReader_1.readInt32)(reader);
                const h = (0, psdReader_1.readInt32)(reader) - y;
                const w = (0, psdReader_1.readInt32)(reader) - x2;
                if (w <= 0 || h <= 0)
                  throw new Error("Invalid bounds");
                const bithDepth = (0, psdReader_1.readInt16)(reader);
                const compression = (0, psdReader_1.readUint8)(reader);
                const alpha = new Uint8Array(w * h);
                if (bithDepth === 8) {
                  if (compression === 0) {
                    alpha.set((0, psdReader_1.readBytes)(reader, alpha.byteLength));
                  } else if (compression === 1) {
                    (0, psdReader_1.readDataRLE)(reader, { width: w, height: h, data: alpha }, w, h, bithDepth, 1, [0], false);
                  } else {
                    throw new Error("Invalid compression");
                  }
                } else if (bithDepth === 16) {
                  if (compression === 0) {
                    for (let i2 = 0; i2 < alpha.byteLength; i2++) {
                      alpha[i2] = (0, psdReader_1.readUint16)(reader) >> 8;
                    }
                  } else if (compression === 1) {
                    throw new Error("not implemented (16bit RLE)");
                  } else {
                    throw new Error("Invalid compression");
                  }
                } else {
                  throw new Error("Invalid depth");
                }
                samples.push({ id, bounds: { x: x2, y, w, h }, alpha });
                reader.offset = brushEnd;
              }
              break;
            }
            case "desc": {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
              for (const brush of desc.Brsh) {
                const b = {
                  name: brush["Nm  "],
                  shape: parseBrushShape(brush.Brsh),
                  spacing: (0, descriptor_1.parsePercent)(brush.Spcn),
                  // TODO: brushGroup ???
                  wetEdges: brush.Wtdg,
                  noise: brush.Nose,
                  // TODO: TxtC ??? smoothing / build-up ?
                  // TODO: 'Rpt ' ???
                  useBrushSize: brush.useBrushSize
                  // ???
                };
                if (brush.interpretation != null)
                  b.interpretation = brush.interpretation;
                if (brush.protectTexture != null)
                  b.protectTexture = brush.protectTexture;
                if (brush.useTipDynamics) {
                  b.shapeDynamics = {
                    tiltScale: (0, descriptor_1.parsePercent)(brush.tiltScale),
                    sizeDynamics: parseDynamics(brush.szVr),
                    angleDynamics: parseDynamics(brush.angleDynamics),
                    roundnessDynamics: parseDynamics(brush.roundnessDynamics),
                    flipX: brush.flipX,
                    flipY: brush.flipY,
                    brushProjection: brush.brushProjection,
                    minimumDiameter: (0, descriptor_1.parsePercent)(brush.minimumDiameter),
                    minimumRoundness: (0, descriptor_1.parsePercent)(brush.minimumRoundness)
                  };
                }
                if (brush.useScatter) {
                  b.scatter = {
                    count: brush["Cnt "],
                    bothAxes: brush.bothAxes,
                    countDynamics: parseDynamics(brush.countDynamics),
                    scatterDynamics: parseDynamics(brush.scatterDynamics)
                  };
                }
                if (brush.useTexture && brush.Txtr) {
                  b.texture = {
                    id: brush.Txtr.Idnt,
                    name: brush.Txtr["Nm  "],
                    blendMode: descriptor_1.BlnM.decode(brush.textureBlendMode),
                    depth: (0, descriptor_1.parsePercent)(brush.textureDepth),
                    depthMinimum: (0, descriptor_1.parsePercent)(brush.minimumDepth),
                    depthDynamics: parseDynamics(brush.textureDepthDynamics),
                    scale: (0, descriptor_1.parsePercent)(brush.textureScale),
                    invert: brush.InvT,
                    brightness: brush.textureBrightness,
                    contrast: brush.textureContrast,
                    textureEachTip: !!brush.TxtC
                  };
                }
                const db = brush.dualBrush;
                if (db && db.useDualBrush) {
                  b.dualBrush = {
                    flip: db.Flip,
                    shape: parseBrushShape(db.Brsh),
                    blendMode: descriptor_1.BlnM.decode(db.BlnM),
                    useScatter: db.useScatter,
                    spacing: (0, descriptor_1.parsePercent)(db.Spcn),
                    count: db["Cnt "],
                    bothAxes: db.bothAxes,
                    countDynamics: parseDynamics(db.countDynamics),
                    scatterDynamics: parseDynamics(db.scatterDynamics)
                  };
                }
                if (brush.useColorDynamics) {
                  b.colorDynamics = {
                    foregroundBackground: parseDynamics(brush.clVr),
                    hue: (0, descriptor_1.parsePercent)(brush["H   "]),
                    saturation: (0, descriptor_1.parsePercent)(brush.Strt),
                    brightness: (0, descriptor_1.parsePercent)(brush.Brgh),
                    purity: (0, descriptor_1.parsePercent)(brush.purity),
                    perTip: brush.colorDynamicsPerTip
                  };
                }
                if (brush.usePaintDynamics) {
                  b.transfer = {
                    flowDynamics: parseDynamics(brush.prVr),
                    opacityDynamics: parseDynamics(brush.opVr),
                    wetnessDynamics: parseDynamics(brush.wtVr),
                    mixDynamics: parseDynamics(brush.mxVr)
                  };
                }
                if (brush.useBrushPose) {
                  b.brushPose = {
                    overrideAngle: brush.overridePoseAngle,
                    overrideTiltX: brush.overridePoseTiltX,
                    overrideTiltY: brush.overridePoseTiltY,
                    overridePressure: brush.overridePosePressure,
                    pressure: (0, descriptor_1.parsePercent)(brush.brushPosePressure),
                    tiltX: brush.brushPoseTiltX,
                    tiltY: brush.brushPoseTiltY,
                    angle: brush.brushPoseAngle
                  };
                }
                const to = brush.toolOptions;
                if (to) {
                  b.toolOptions = {
                    type: toBrushType[to._classID] || "brush",
                    brushPreset: to.brushPreset,
                    flow: (_a2 = to.flow) !== null && _a2 !== void 0 ? _a2 : 100,
                    smooth: (_b2 = to.Smoo) !== null && _b2 !== void 0 ? _b2 : 0,
                    mode: descriptor_1.BlnM.decode(to["Md  "] || "BlnM.Nrml"),
                    // sometimes mode is missing
                    opacity: (_c = to.Opct) !== null && _c !== void 0 ? _c : 100,
                    smoothing: !!to.smoothing,
                    smoothingValue: to.smoothingValue || 0,
                    smoothingRadiusMode: !!to.smoothingRadiusMode,
                    smoothingCatchup: !!to.smoothingCatchup,
                    smoothingCatchupAtEnd: !!to.smoothingCatchupAtEnd,
                    smoothingZoomCompensation: !!to.smoothingZoomCompensation,
                    pressureSmoothing: !!to.pressureSmoothing,
                    usePressureOverridesSize: !!to.usePressureOverridesSize,
                    usePressureOverridesOpacity: !!to.usePressureOverridesOpacity,
                    useLegacy: !!to.useLegacy
                  };
                  if (to.prVr)
                    b.toolOptions.flowDynamics = parseDynamics(to.prVr);
                  if (to.opVr)
                    b.toolOptions.opacityDynamics = parseDynamics(to.opVr);
                  if (to.szVr)
                    b.toolOptions.sizeDynamics = parseDynamics(to.szVr);
                  if ("wetness" in to)
                    b.toolOptions.wetness = to.wetness;
                  if ("dryness" in to)
                    b.toolOptions.dryness = to.dryness;
                  if ("mix" in to)
                    b.toolOptions.mix = to.mix;
                  if ("autoFill" in to)
                    b.toolOptions.autoFill = to.autoFill;
                  if ("autoClean" in to)
                    b.toolOptions.autoClean = to.autoClean;
                  if ("loadSolidColorOnly" in to)
                    b.toolOptions.loadSolidColorOnly = to.loadSolidColorOnly;
                  if ("sampleAllLayers" in to)
                    b.toolOptions.sampleAllLayers = to.sampleAllLayers;
                  if ("SmdF" in to)
                    b.toolOptions.smudgeFingerPainting = to.SmdF;
                  if ("SmdS" in to)
                    b.toolOptions.smudgeSampleAllLayers = to.SmdS;
                  if ("Prs " in to)
                    b.toolOptions.strength = to["Prs "];
                }
                brushes.push(b);
              }
              break;
            }
            case "patt": {
              while (reader.offset < end) {
                patterns.push((0, psdReader_1.readPattern)(reader));
              }
              reader.offset = end;
              break;
            }
            case "phry": {
              const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
              if (options.logMissingFeatures) {
                if ((_d = desc.hierarchy) === null || _d === void 0 ? void 0 : _d.length) {
                }
              }
              break;
            }
            default:
              throw new Error(`Invalid brush type: ${type}`);
          }
          while (size % 4) {
            reader.offset++;
            size++;
          }
        }
      } else {
        throw new Error(`Unsupported ABR version (${version})`);
      }
      return { samples, patterns, brushes };
    }
  }
});

// node_modules/ag-psd/dist/csh.js
var require_csh = __commonJS({
  "node_modules/ag-psd/dist/csh.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readCsh = readCsh;
    var additionalInfo_1 = require_additionalInfo();
    var psdReader_1 = require_psdReader();
    function readCsh(buffer) {
      const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const csh = { shapes: [] };
      (0, psdReader_1.checkSignature)(reader, "cush");
      if ((0, psdReader_1.readUint32)(reader) !== 2)
        throw new Error("Invalid version");
      const count = (0, psdReader_1.readUint32)(reader);
      for (let i2 = 0; i2 < count; i2++) {
        const name = (0, psdReader_1.readUnicodeString)(reader);
        while (reader.offset % 4)
          reader.offset++;
        if ((0, psdReader_1.readUint32)(reader) !== 1)
          throw new Error("Invalid shape version");
        const size = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + size;
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        const y1 = (0, psdReader_1.readUint32)(reader);
        const x1 = (0, psdReader_1.readUint32)(reader);
        const y2 = (0, psdReader_1.readUint32)(reader);
        const x2 = (0, psdReader_1.readUint32)(reader);
        const width = x2 - x1;
        const height = y2 - y1;
        const mask = { paths: [] };
        (0, additionalInfo_1.readVectorMask)(reader, mask, width, height, end - reader.offset);
        csh.shapes.push(Object.assign({ name, id, width, height }, mask));
        reader.offset = end;
      }
      return csh;
    }
  }
});

// node_modules/ag-psd/dist/psd.js
var require_psd = __commonJS({
  "node_modules/ag-psd/dist/psd.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Compression = exports.ChannelID = exports.LayerCompCapturedInfo = exports.SectionDividerType = exports.ColorMode = void 0;
    var ColorMode;
    (function(ColorMode2) {
      ColorMode2[ColorMode2["Bitmap"] = 0] = "Bitmap";
      ColorMode2[ColorMode2["Grayscale"] = 1] = "Grayscale";
      ColorMode2[ColorMode2["Indexed"] = 2] = "Indexed";
      ColorMode2[ColorMode2["RGB"] = 3] = "RGB";
      ColorMode2[ColorMode2["CMYK"] = 4] = "CMYK";
      ColorMode2[ColorMode2["Multichannel"] = 7] = "Multichannel";
      ColorMode2[ColorMode2["Duotone"] = 8] = "Duotone";
      ColorMode2[ColorMode2["Lab"] = 9] = "Lab";
    })(ColorMode || (exports.ColorMode = ColorMode = {}));
    var SectionDividerType;
    (function(SectionDividerType2) {
      SectionDividerType2[SectionDividerType2["Other"] = 0] = "Other";
      SectionDividerType2[SectionDividerType2["OpenFolder"] = 1] = "OpenFolder";
      SectionDividerType2[SectionDividerType2["ClosedFolder"] = 2] = "ClosedFolder";
      SectionDividerType2[SectionDividerType2["BoundingSectionDivider"] = 3] = "BoundingSectionDivider";
    })(SectionDividerType || (exports.SectionDividerType = SectionDividerType = {}));
    var LayerCompCapturedInfo;
    (function(LayerCompCapturedInfo2) {
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["None"] = 0] = "None";
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["Visibility"] = 1] = "Visibility";
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["Position"] = 2] = "Position";
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["Appearance"] = 4] = "Appearance";
    })(LayerCompCapturedInfo || (exports.LayerCompCapturedInfo = LayerCompCapturedInfo = {}));
    var ChannelID;
    (function(ChannelID2) {
      ChannelID2[ChannelID2["Color0"] = 0] = "Color0";
      ChannelID2[ChannelID2["Color1"] = 1] = "Color1";
      ChannelID2[ChannelID2["Color2"] = 2] = "Color2";
      ChannelID2[ChannelID2["Color3"] = 3] = "Color3";
      ChannelID2[ChannelID2["Transparency"] = -1] = "Transparency";
      ChannelID2[ChannelID2["UserMask"] = -2] = "UserMask";
      ChannelID2[ChannelID2["RealUserMask"] = -3] = "RealUserMask";
    })(ChannelID || (exports.ChannelID = ChannelID = {}));
    var Compression;
    (function(Compression2) {
      Compression2[Compression2["RawData"] = 0] = "RawData";
      Compression2[Compression2["RleCompressed"] = 1] = "RleCompressed";
      Compression2[Compression2["ZipWithoutPrediction"] = 2] = "ZipWithoutPrediction";
      Compression2[Compression2["ZipWithPrediction"] = 3] = "ZipWithPrediction";
    })(Compression || (exports.Compression = Compression = {}));
  }
});

// node_modules/ag-psd/dist/index.js
var require_dist = __commonJS({
  "node_modules/ag-psd/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCompositeCanvas = exports.getCompositeImageData = exports.getLayerRealMaskCanvas = exports.getLayerMaskCanvas = exports.getLayerCanvas = exports.getLayerRealMaskImageData = exports.getLayerMaskImageData = exports.getLayerImageData = exports.decodeLayerPixels = exports.byteArrayToBase64 = exports.initializeCanvas = void 0;
    exports.readPsd = readPsd;
    exports.writePsd = writePsd2;
    exports.writePsdUint8Array = writePsdUint8Array;
    exports.writePsdBuffer = writePsdBuffer;
    var psdWriter_1 = require_psdWriter();
    var psdReader_1 = require_psdReader();
    Object.defineProperty(exports, "decodeLayerPixels", { enumerable: true, get: function() {
      return psdReader_1.decodeLayerPixels;
    } });
    Object.defineProperty(exports, "getLayerImageData", { enumerable: true, get: function() {
      return psdReader_1.getLayerImageData;
    } });
    Object.defineProperty(exports, "getLayerMaskImageData", { enumerable: true, get: function() {
      return psdReader_1.getLayerMaskImageData;
    } });
    Object.defineProperty(exports, "getLayerRealMaskImageData", { enumerable: true, get: function() {
      return psdReader_1.getLayerRealMaskImageData;
    } });
    Object.defineProperty(exports, "getLayerCanvas", { enumerable: true, get: function() {
      return psdReader_1.getLayerCanvas;
    } });
    Object.defineProperty(exports, "getLayerMaskCanvas", { enumerable: true, get: function() {
      return psdReader_1.getLayerMaskCanvas;
    } });
    Object.defineProperty(exports, "getLayerRealMaskCanvas", { enumerable: true, get: function() {
      return psdReader_1.getLayerRealMaskCanvas;
    } });
    Object.defineProperty(exports, "getCompositeImageData", { enumerable: true, get: function() {
      return psdReader_1.getCompositeImageData;
    } });
    Object.defineProperty(exports, "getCompositeCanvas", { enumerable: true, get: function() {
      return psdReader_1.getCompositeCanvas;
    } });
    var base64_js_1 = require_base64_js();
    __exportStar(require_abr(), exports);
    __exportStar(require_csh(), exports);
    var helpers_1 = require_helpers();
    Object.defineProperty(exports, "initializeCanvas", { enumerable: true, get: function() {
      return helpers_1.initializeCanvas;
    } });
    __exportStar(require_psd(), exports);
    exports.byteArrayToBase64 = base64_js_1.fromByteArray;
    function readPsd(buffer, options) {
      const reader = "buffer" in buffer ? (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength) : (0, psdReader_1.createReader)(buffer);
      return (0, psdReader_1.readPsd)(reader, options);
    }
    function writePsd2(psd, options) {
      const writer = (0, psdWriter_1.createWriter)();
      (0, psdWriter_1.writePsd)(writer, psd, options);
      return (0, psdWriter_1.getWriterBuffer)(writer);
    }
    function writePsdUint8Array(psd, options) {
      const writer = (0, psdWriter_1.createWriter)();
      (0, psdWriter_1.writePsd)(writer, psd, options);
      return (0, psdWriter_1.getWriterBufferNoCopy)(writer);
    }
    function writePsdBuffer(psd, options) {
      if (typeof Buffer === "undefined") {
        throw new Error("Buffer not supported on this platform");
      }
      return Buffer.from(writePsdUint8Array(psd, options));
    }
  }
});

// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i2 = 0; i2 < d.length; ++i2) {
    if (d[i2])
      t.push({ s: i2, f: d[i2] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i22].f ? i0++ : i22++];
    r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i2 = 1; i2 < s; ++i2) {
    if (t2[i2].s > maxSym)
      maxSym = t2[i2].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i2 < s; ++i2) {
      var i2_1 = t2[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i2].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i2;
    }
    for (; i2 >= 0 && dt; --i2) {
      var i2_3 = t2[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1; i2 <= s; ++i2) {
    if (c[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i2 = 0; i2 < 256; ++i2) {
    var c = i2, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i2] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i2 = 0; i2 < d.length; ++i2)
        cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (val instanceof u8)
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0; i2 < str.length; ++i2)
      ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i2 = 0; i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i2);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
  var _a2 = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
};
var z64e = function(d, b) {
  for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
    ;
  return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i2 = 0; i2 < files.length; ++i2) {
    var f = files[i2];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = o == 4294967295 || c == 65535;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// node_modules/earcut/src/earcut.js
function earcut(data, holeIndices, dim = 2) {
  const hasHoles = holeIndices && holeIndices.length;
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  const triangles = [];
  if (!outerNode || outerNode.next === outerNode.prev) return triangles;
  let minX, minY, invSize;
  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
  if (data.length > 80 * dim) {
    minX = data[0];
    minY = data[1];
    let maxX = minX;
    let maxY = minY;
    for (let i2 = dim; i2 < outerLen; i2 += dim) {
      const x2 = data[i2];
      const y = data[i2 + 1];
      if (x2 < minX) minX = x2;
      if (y < minY) minY = y;
      if (x2 > maxX) maxX = x2;
      if (y > maxY) maxY = y;
    }
    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 32767 / invSize : 0;
  }
  earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
  return triangles;
}
function linkedList(data, start, end, dim, clockwise) {
  let last;
  if (clockwise === signedArea(data, start, end, dim) > 0) {
    for (let i2 = start; i2 < end; i2 += dim) last = insertNode(i2 / dim | 0, data[i2], data[i2 + 1], last);
  } else {
    for (let i2 = end - dim; i2 >= start; i2 -= dim) last = insertNode(i2 / dim | 0, data[i2], data[i2 + 1], last);
  }
  if (last && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }
  return last;
}
function filterPoints(start, end) {
  if (!start) return start;
  if (!end) end = start;
  let p = start, again;
  do {
    again = false;
    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      removeNode(p);
      p = end = p.prev;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  } while (again || p !== end);
  return end;
}
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
  if (!ear) return;
  if (!pass && invSize) indexCurve(ear, minX, minY, invSize);
  let stop = ear;
  while (ear.prev !== ear.next) {
    const prev = ear.prev;
    const next = ear.next;
    if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      triangles.push(prev.i, ear.i, next.i);
      removeNode(ear);
      ear = next.next;
      stop = next.next;
      continue;
    }
    ear = next;
    if (ear === stop) {
      if (!pass) {
        earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);
      } else if (pass === 1) {
        ear = cureLocalIntersections(filterPoints(ear), triangles);
        earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);
      } else if (pass === 2) {
        splitEarcut(ear, triangles, dim, minX, minY, invSize);
      }
      break;
    }
  }
}
function isEar(ear) {
  const a = ear.prev, b = ear, c = ear.next;
  if (area(a, b, c) >= 0) return false;
  const ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
  const x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy);
  let p = c.next;
  while (p !== a) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.next;
  }
  return true;
}
function isEarHashed(ear, minX, minY, invSize) {
  const a = ear.prev, b = ear, c = ear.next;
  if (area(a, b, c) >= 0) return false;
  const ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
  const x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy);
  const minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize);
  let p = ear.prevZ, n = ear.nextZ;
  while (p && p.z >= minZ && n && n.z <= maxZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  }
  while (p && p.z >= minZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
  }
  while (n && n.z <= maxZ) {
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  }
  return true;
}
function cureLocalIntersections(start, triangles) {
  let p = start;
  do {
    const a = p.prev, b = p.next.next;
    if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i, p.i, b.i);
      removeNode(p);
      removeNode(p.next);
      p = start = b;
    }
    p = p.next;
  } while (p !== start);
  return filterPoints(p);
}
function splitEarcut(start, triangles, dim, minX, minY, invSize) {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c = splitPolygon(a, b);
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);
        earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
        earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}
function eliminateHoles(data, holeIndices, outerNode, dim) {
  const queue = [];
  for (let i2 = 0, len = holeIndices.length; i2 < len; i2++) {
    const start = holeIndices[i2] * dim;
    const end = i2 < len - 1 ? holeIndices[i2 + 1] * dim : data.length;
    const list = linkedList(data, start, end, dim, false);
    if (list === list.next) list.steiner = true;
    queue.push(getLeftmost(list));
  }
  queue.sort(compareXYSlope);
  for (let i2 = 0; i2 < queue.length; i2++) {
    outerNode = eliminateHole(queue[i2], outerNode);
  }
  return outerNode;
}
function compareXYSlope(a, b) {
  let result = a.x - b.x;
  if (result === 0) {
    result = a.y - b.y;
    if (result === 0) {
      const aSlope = (a.next.y - a.y) / (a.next.x - a.x);
      const bSlope = (b.next.y - b.y) / (b.next.x - b.x);
      result = aSlope - bSlope;
    }
  }
  return result;
}
function eliminateHole(hole, outerNode) {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) {
    return outerNode;
  }
  const bridgeReverse = splitPolygon(bridge, hole);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
}
function findHoleBridge(hole, outerNode) {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m;
  if (equals(hole, p)) return p;
  do {
    if (equals(hole, p.next)) return p.next;
    else if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      const x2 = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
      if (x2 <= hx && x2 > qx) {
        qx = x2;
        m = p.x < p.next.x ? p : p.next;
        if (x2 === hx) return m;
      }
    }
    p = p.next;
  } while (p !== outerNode);
  if (!m) return null;
  const stop = m;
  const mx = m.x;
  const my = m.y;
  let tanMin = Infinity;
  p = m;
  do {
    if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
      const tan = Math.abs(hy - p.y) / (hx - p.x);
      if (locallyInside(p, hole) && (tan < tanMin || tan === tanMin && (p.x > m.x || p.x === m.x && sectorContainsSector(m, p)))) {
        m = p;
        tanMin = tan;
      }
    }
    p = p.next;
  } while (p !== stop);
  return m;
}
function sectorContainsSector(m, p) {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}
function indexCurve(start, minX, minY, invSize) {
  let p = start;
  do {
    if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p = p.next;
  } while (p !== start);
  p.prevZ.nextZ = null;
  p.prevZ = null;
  sortLinked(p);
}
function sortLinked(list) {
  let numMerges;
  let inSize = 1;
  do {
    let p = list;
    let e;
    list = null;
    let tail = null;
    numMerges = 0;
    while (p) {
      numMerges++;
      let q = p;
      let pSize = 0;
      for (let i2 = 0; i2 < inSize; i2++) {
        pSize++;
        q = q.nextZ;
        if (!q) break;
      }
      let qSize = inSize;
      while (pSize > 0 || qSize > 0 && q) {
        if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
          e = p;
          p = p.nextZ;
          pSize--;
        } else {
          e = q;
          q = q.nextZ;
          qSize--;
        }
        if (tail) tail.nextZ = e;
        else list = e;
        e.prevZ = tail;
        tail = e;
      }
      p = q;
    }
    tail.nextZ = null;
    inSize *= 2;
  } while (numMerges > 1);
  return list;
}
function zOrder(x2, y, minX, minY, invSize) {
  x2 = (x2 - minX) * invSize | 0;
  y = (y - minY) * invSize | 0;
  x2 = (x2 | x2 << 8) & 16711935;
  x2 = (x2 | x2 << 4) & 252645135;
  x2 = (x2 | x2 << 2) & 858993459;
  x2 = (x2 | x2 << 1) & 1431655765;
  y = (y | y << 8) & 16711935;
  y = (y | y << 4) & 252645135;
  y = (y | y << 2) & 858993459;
  y = (y | y << 1) & 1431655765;
  return x2 | y << 1;
}
function getLeftmost(start) {
  let p = start, leftmost = start;
  do {
    if (p.x < leftmost.x || p.x === leftmost.x && p.y < leftmost.y) leftmost = p;
    p = p.next;
  } while (p !== start);
  return leftmost;
}
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
  return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
}
function pointInTriangleExceptFirst(ax, ay, bx, by, cx, cy, px, py) {
  return !(ax === px && ay === py) && pointInTriangle(ax, ay, bx, by, cx, cy, px, py);
}
function isValidDiagonal(a, b) {
  return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // doesn't intersect other edges
  (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible
  (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
  equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0);
}
function area(p, q, r) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}
function equals(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}
function intersects(p1, q1, p2, q2) {
  const o1 = sign(area(p1, q1, p2));
  const o2 = sign(area(p1, q1, q2));
  const o3 = sign(area(p2, q2, p1));
  const o4 = sign(area(p2, q2, q1));
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}
function onSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}
function sign(num) {
  return num > 0 ? 1 : num < 0 ? -1 : 0;
}
function intersectsPolygon(a, b) {
  let p = a;
  do {
    if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true;
    p = p.next;
  } while (p !== a);
  return false;
}
function locallyInside(a, b) {
  return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}
function middleInside(a, b) {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    if (p.y > py !== p.next.y > py && p.next.y !== p.y && px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x)
      inside = !inside;
    p = p.next;
  } while (p !== a);
  return inside;
}
function splitPolygon(a, b) {
  const a2 = createNode(a.i, a.x, a.y), b22 = createNode(b.i, b.x, b.y), an = a.next, bp = b.prev;
  a.next = b;
  b.prev = a;
  a2.next = an;
  an.prev = a2;
  b22.next = a2;
  a2.prev = b22;
  bp.next = b22;
  b22.prev = bp;
  return b22;
}
function insertNode(i2, x2, y, last) {
  const p = createNode(i2, x2, y);
  if (!last) {
    p.prev = p;
    p.next = p;
  } else {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }
  return p;
}
function removeNode(p) {
  p.next.prev = p.prev;
  p.prev.next = p.next;
  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}
function createNode(i2, x2, y) {
  return {
    i: i2,
    // vertex index in coordinates array
    x: x2,
    y,
    // vertex coordinates
    prev: null,
    // previous and next vertex nodes in a polygon ring
    next: null,
    z: 0,
    // z-order curve value
    prevZ: null,
    // previous and next nodes in z-order
    nextZ: null,
    steiner: false
    // indicates whether this is a steiner point
  };
}
function signedArea(data, start, end, dim) {
  let sum = 0;
  for (let i2 = start, j = end - dim; i2 < end; i2 += dim) {
    sum += (data[j] - data[i2]) * (data[i2 + 1] + data[j + 1]);
    j = i2;
  }
  return sum;
}

// node_modules/flatbuffers/mjs/utils.js
var int32 = new Int32Array(2);
var float32 = new Float32Array(int32.buffer);
var float64 = new Float64Array(int32.buffer);
var isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

// node_modules/flatbuffers/mjs/encoding.js
var Encoding;
(function(Encoding2) {
  Encoding2[Encoding2["UTF8_BYTES"] = 1] = "UTF8_BYTES";
  Encoding2[Encoding2["UTF16_STRING"] = 2] = "UTF16_STRING";
})(Encoding || (Encoding = {}));

// node_modules/openskp/dist/index.mjs
var PROGRESS_INTERVAL = 500;
function emitLog(options, level, message) {
  options?.onLog?.(level, message);
}
function emitProgress(options, stage, current, total) {
  options?.onProgress?.({ stage, current, total });
}
var VFF_MAGIC = [255, 254, 255, 14];
var ZIP_LOCAL_HEADER = [80, 75, 3, 4];
function findSequence(data, sequence, startOffset = 0) {
  const seqLen = sequence.length;
  if (seqLen === 0) return -1;
  const limit = data.length - seqLen;
  for (let i2 = startOffset; i2 <= limit; i2++) {
    let match = true;
    for (let j = 0; j < seqLen; j++) {
      if (data[i2 + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return i2;
  }
  return -1;
}
function decodeEntryName(entry) {
  if (!/[\u0080-\u00ff]/.test(entry)) return entry;
  const bytes = new Uint8Array(entry.length);
  for (let i2 = 0; i2 < entry.length; i2++) {
    const code = entry.charCodeAt(i2);
    if (code > 255) return entry;
    bytes[i2] = code;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return entry;
  }
}
function validateHeader(data) {
  if (data.length < 4) return false;
  return data[0] === VFF_MAGIC[0] && data[1] === VFF_MAGIC[1] && data[2] === VFF_MAGIC[2] && data[3] === VFF_MAGIC[3];
}
function readVersion(data, options) {
  if (data.length < 16) return "unknown";
  const secondMarker = findSequence(data, [255, 254, 255], 4);
  if (secondMarker > 0) {
    const verStart = secondMarker + 4;
    const verBytes = data.subarray(verStart, Math.min(verStart + 200, data.length));
    try {
      const decoder = new TextDecoder("utf-16le");
      const verText = decoder.decode(verBytes);
      const braceStart = verText.indexOf("{");
      if (braceStart >= 0) {
        const braceEnd = verText.indexOf("}", braceStart);
        if (braceEnd > braceStart) {
          return verText.slice(braceStart, braceEnd + 1);
        }
      }
    } catch (e) {
      emitLog(options, "debug", `Failed to decode version string: ${e.message}`);
    }
  }
  return "unknown";
}
function findZipOffset(data) {
  const offset = findSequence(data, ZIP_LOCAL_HEADER);
  if (offset < 0) {
    throw new Error("No embedded ZIP archive found in the file");
  }
  return offset;
}
var META_WRAPPER_TAG = [100, 0];
var META_UNITS_TAG = [109, 0];
function readMetaUnits(metaBytes) {
  const view = new DataView(metaBytes.buffer, metaBytes.byteOffset, metaBytes.byteLength);
  let pos = 0;
  while (pos + 6 <= metaBytes.length) {
    const tag = [metaBytes[pos], metaBytes[pos + 1]];
    const size = view.getUint32(pos + 2, true);
    if (pos + 6 + size > metaBytes.length) break;
    if (tag[0] === META_WRAPPER_TAG[0] && tag[1] === META_WRAPPER_TAG[1]) {
      return readMetaUnits(metaBytes.subarray(pos + 6, pos + 6 + size));
    }
    if (tag[0] === META_UNITS_TAG[0] && tag[1] === META_UNITS_TAG[1]) {
      return new TextDecoder("utf-8").decode(metaBytes.subarray(pos + 6, pos + 6 + size));
    }
    pos += 6 + size;
  }
  return null;
}
var MAX_UNCOMPRESSED_ENTRY_BYTES = 16 * 1024 * 1024 * 1024;
var MAX_COMPRESSION_RATIO = 1e3;
var RATIO_CHECK_THRESHOLD_BYTES = 1024 * 1024;
function validateEntrySize(file) {
  const declared = file.originalSize;
  if (declared <= 0) return;
  if (declared > MAX_UNCOMPRESSED_ENTRY_BYTES) {
    throw new Error(
      `ZIP entry '${file.name}' declares ${declared} bytes uncompressed, exceeding the ${MAX_UNCOMPRESSED_ENTRY_BYTES}-byte safety ceiling`
    );
  }
  if (declared >= RATIO_CHECK_THRESHOLD_BYTES) {
    const compressed = file.size;
    if (compressed <= 0 || declared / compressed > MAX_COMPRESSION_RATIO) {
      throw new Error(
        `ZIP entry '${file.name}' declares an implausible compression ratio (${declared} bytes from ${compressed} bytes compressed) - likely a decompression bomb`
      );
    }
  }
}
function extractSkpContents(data, options) {
  if (!validateHeader(data)) {
    const zipInHeader = findSequence(data.subarray(0, Math.min(64, data.length)), ZIP_LOCAL_HEADER) >= 0;
    if (!zipInHeader) {
      throw new Error("Not a valid SketchUp (.skp) file");
    }
  }
  const version = readVersion(data, options);
  const zipOffset = findZipOffset(data);
  const zipBytes = data.subarray(zipOffset);
  const wanted = (file) => {
    const lower = file.name.toLowerCase();
    const isWanted = lower === "model.dat" || lower.endsWith("/model.dat") || lower === "meta/meta.dat" || lower.endsWith(".xml") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("material");
    if (isWanted) validateEntrySize(file);
    return isWanted;
  };
  let unzipped;
  try {
    unzipped = unzipSync(zipBytes, { filter: wanted });
  } catch (e) {
    const wrapped = new Error("Failed to decompress ZIP archive: " + e.message);
    wrapped.cause = e;
    throw wrapped;
  }
  let modelData = null;
  let metaData = null;
  const materialFiles = {};
  for (const rawEntry of Object.keys(unzipped)) {
    const entry = decodeEntryName(rawEntry);
    const lower = entry.toLowerCase();
    if (lower === "model.dat" || lower.endsWith("/model.dat")) {
      modelData = unzipped[rawEntry];
    } else if (lower === "meta/meta.dat") {
      metaData = unzipped[rawEntry];
    } else if (lower.endsWith(".xml") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("material")) {
      materialFiles[entry] = unzipped[rawEntry];
    }
  }
  if (!modelData) {
    throw new Error("ZIP archive found but does not contain a model.dat entry");
  }
  return {
    version,
    modelData,
    materialFiles,
    metaData
  };
}
var CONTAINER_TAGS = /* @__PURE__ */ new Set([
  "F401",
  "F701",
  "D430",
  "D530",
  "C832",
  "7C15",
  "8813",
  "8913",
  "8A13",
  "8B13",
  "8C13",
  "8D13",
  "4C1D",
  "6419",
  "F901",
  "7017",
  "7117",
  "D007",
  "C409",
  "9411",
  "9511",
  "0F01",
  "384A",
  "B80B",
  "9713",
  "2C4C",
  "AC0D",
  "AE0D",
  "F601",
  "F801",
  "983A",
  "993A",
  "8C3C",
  "8D3C",
  // Image-entity placement: an Image placed in the model wraps a standard
  // 6419 instance node inside 9013 -> 401F. Without these two containers,
  // that inner instance stays buried in an opaque payload and the image
  // definition looks "never placed".
  "9013",
  "401F"
]);
function readU32(data, offset) {
  if (offset + 4 > data.length) {
    throw new Error("Out of bounds readU32");
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return view.getUint32(0, true);
}
function readF64(data, offset) {
  if (offset + 8 > data.length) {
    throw new Error("Out of bounds readF64");
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return view.getFloat64(0, true);
}
function readI32(data, offset) {
  if (offset + 4 > data.length) {
    throw new Error("Out of bounds readI32");
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return view.getInt32(0, true);
}
function parseVarInt(data, offset, length) {
  let val = 0;
  for (let i2 = 0; i2 < length; i2++) {
    val += data[offset + i2] * Math.pow(256, i2);
  }
  return val;
}
function parseTlvRecursive(data, start, end, containerTags = CONTAINER_TAGS, depth = 0) {
  let pos = start;
  const elements = [];
  while (pos <= end - 6) {
    const tagBytes = data.subarray(pos, pos + 2);
    const size = readU32(data, pos + 2);
    if (pos + 6 + size > end) {
      break;
    }
    let tagHex = "";
    for (let i2 = 0; i2 < 2; i2++) {
      const hex = tagBytes[i2].toString(16).toUpperCase();
      tagHex += hex.length === 1 ? "0" + hex : hex;
    }
    let children = [];
    const isContainer = containerTags.has(tagHex);
    if (isContainer && size > 0) {
      children = parseTlvRecursive(
        data,
        pos + 6,
        pos + 6 + size,
        containerTags,
        depth + 1
      );
    }
    const payload = children.length > 0 ? new Uint8Array(0) : data.subarray(pos + 6, pos + 6 + size);
    elements.push({
      offset: pos,
      tag: tagHex,
      size,
      children,
      payload
    });
    pos += 6 + size;
  }
  return elements;
}
function flatHeaders(data, start, end) {
  const headers = [];
  let pos = start;
  while (pos <= end - 6) {
    const tagBytes = data.subarray(pos, pos + 2);
    const size = readU32(data, pos + 2);
    if (pos + 6 + size > end) break;
    let tagHex = "";
    for (let i2 = 0; i2 < 2; i2++) {
      const hex = tagBytes[i2].toString(16).toUpperCase();
      tagHex += hex.length === 1 ? "0" + hex : hex;
    }
    headers.push([tagHex, pos, size]);
    pos += 6 + size;
  }
  return headers;
}
function* iterTopLevelLazy(data, start, end, containerTags = CONTAINER_TAGS) {
  let headers = flatHeaders(data, start, end);
  if (headers.length === 1 && headers[0][0] === "F401") {
    const [, f401Offset, f401Size] = headers[0];
    headers = flatHeaders(data, f401Offset + 6, f401Offset + 6 + f401Size);
  }
  const total = headers.length;
  let index = 0;
  for (const [, offset, size] of headers) {
    const recordEnd = offset + 6 + size;
    const nodes = parseTlvRecursive(data, offset, recordEnd, containerTags);
    if (nodes.length > 0) {
      yield { index, total, node: nodes[0] };
    }
    index++;
  }
}
var SkpParseError = class _SkpParseError extends Error {
  constructor(message, context = {}) {
    const parts = [message];
    if (context.stage !== void 0) parts.push(`stage=${context.stage}`);
    if (context.recordIndex !== void 0 && context.totalRecords !== void 0) {
      parts.push(`record=${context.recordIndex}/${context.totalRecords}`);
    }
    if (context.tag !== void 0) parts.push(`tag=${context.tag}`);
    if (context.offset !== void 0) parts.push(`offset=0x${context.offset.toString(16).toUpperCase()}`);
    if (context.definitionId !== void 0) parts.push(`definitionId=${context.definitionId}`);
    super(parts.join(" | "));
    this.name = "SkpParseError";
    this.stage = context.stage;
    this.recordIndex = context.recordIndex;
    this.totalRecords = context.totalRecords;
    this.tag = context.tag;
    this.offset = context.offset;
    this.definitionId = context.definitionId;
    this.cause = context.cause;
    Object.setPrototypeOf(this, _SkpParseError.prototype);
  }
};
var EdgeFlagStore = class {
  constructor() {
    this.flags = new Uint8Array(0);
    this.present = new Uint8Array(0);
    this.baseId = 0;
    this.initialized = false;
    this.count = 0;
  }
  /** Number of ids actually stored. */
  get size() {
    return this.count;
  }
  slotFor(id) {
    return id - this.baseId;
  }
  /** Grow (and, for an id below `baseId`, shift) so `id` has a slot. */
  ensureSlot(id) {
    if (!this.initialized) {
      this.baseId = id;
      this.flags = new Uint8Array(64);
      this.present = new Uint8Array(8);
      this.initialized = true;
      return 0;
    }
    if (id < this.baseId) {
      const shift = this.baseId - id;
      const needed = shift + this.flags.length;
      const nextFlags = new Uint8Array(Math.max(needed, this.flags.length * 2));
      nextFlags.set(this.flags, shift);
      this.flags = nextFlags;
      const nextPresent = new Uint8Array(Math.ceil(nextFlags.length / 8));
      for (let slot2 = 0; slot2 < this.flags.length - shift; slot2++) {
        if ((this.present[slot2 >> 3] & 1 << (slot2 & 7)) !== 0) {
          const moved = slot2 + shift;
          nextPresent[moved >> 3] |= 1 << (moved & 7);
        }
      }
      this.present = nextPresent;
      this.baseId = id;
      return 0;
    }
    const slot = this.slotFor(id);
    if (slot >= this.flags.length) {
      const nextLength = Math.max(slot + 1, this.flags.length * 2);
      const nextFlags = new Uint8Array(nextLength);
      nextFlags.set(this.flags);
      this.flags = nextFlags;
      const nextPresent = new Uint8Array(Math.ceil(nextLength / 8));
      nextPresent.set(this.present);
      this.present = nextPresent;
    }
    return slot;
  }
  set(id, flags) {
    const slot = this.ensureSlot(id);
    if ((this.present[slot >> 3] & 1 << (slot & 7)) === 0) {
      this.present[slot >> 3] |= 1 << (slot & 7);
      this.count++;
    }
    this.flags[slot] = flags & 255;
  }
  /** The stored byte, or `undefined` when the id was never written -
   * matching `Map.prototype.get`, so callers' `?? 0` fallbacks behave
   * exactly as before. */
  get(id) {
    if (!this.initialized) return void 0;
    const slot = this.slotFor(id);
    if (slot < 0 || slot >= this.flags.length) return void 0;
    if ((this.present[slot >> 3] & 1 << (slot & 7)) === 0) return void 0;
    return this.flags[slot];
  }
  has(id) {
    return this.get(id) !== void 0;
  }
};
var INITIAL_CAPACITY = 256;
var BaseVertexStore = class {
  constructor() {
    this.coords = new Float64Array(INITIAL_CAPACITY * 3);
    this.idList = new Uint32Array(INITIAL_CAPACITY);
    this.count = 0;
  }
  get size() {
    return this.count;
  }
  grow() {
    if (this.count < this.idList.length) return;
    const nextCapacity = this.idList.length * 2;
    const nextCoords = new Float64Array(nextCapacity * 3);
    nextCoords.set(this.coords);
    this.coords = nextCoords;
    const nextIds = new Uint32Array(nextCapacity);
    nextIds.set(this.idList);
    this.idList = nextIds;
  }
  set(id, xyz) {
    const existing = this.slotOf(id);
    const slot = existing >= 0 ? existing : this.count;
    if (existing < 0) {
      this.grow();
      this.idList[slot] = id;
      this.count++;
      this.remember(id, slot);
    }
    this.coords[slot * 3] = xyz[0];
    this.coords[slot * 3 + 1] = xyz[1];
    this.coords[slot * 3 + 2] = xyz[2];
  }
  get(id) {
    const slot = this.slotOf(id);
    if (slot < 0) return void 0;
    return [this.coords[slot * 3], this.coords[slot * 3 + 1], this.coords[slot * 3 + 2]];
  }
  has(id) {
    return this.slotOf(id) >= 0;
  }
  *entries() {
    for (let i2 = 0; i2 < this.count; i2++) {
      yield [
        this.idList[i2],
        [this.coords[i2 * 3], this.coords[i2 * 3 + 1], this.coords[i2 * 3 + 2]]
      ];
    }
  }
  *ids() {
    for (let i2 = 0; i2 < this.count; i2++) yield this.idList[i2];
  }
};
var MapVertexStore = class extends BaseVertexStore {
  constructor() {
    super(...arguments);
    this.index = /* @__PURE__ */ new Map();
  }
  slotOf(id) {
    const slot = this.index.get(id);
    return slot === void 0 ? -1 : slot;
  }
  remember(id, slot) {
    this.index.set(id, slot);
  }
};
var DefaultVertexStore = MapVertexStore;
var GeometryBuilder = class {
  constructor() {
    this.vertices = new DefaultVertexStore();
    this.edges = /* @__PURE__ */ new Map();
    this.edgeFlags = new EdgeFlagStore();
    this.faces = /* @__PURE__ */ new Map();
    this.instances = [];
    this.sectionPlanes = [];
    this.texts = [];
    this.dimensions = [];
    this.constructionLines = [];
    this.constructionPoints = [];
  }
};
function findChildTag(nodes, target) {
  for (const n of nodes) {
    if (n.tag === target) {
      return n;
    }
    const res = findChildTag(n.children, target);
    if (res) return res;
  }
  return null;
}
function findAllNodesRec(nodes, targetTag, results) {
  for (const n of nodes) {
    if (n.tag === targetTag) {
      results.push(n);
    }
    findAllNodesRec(n.children, targetTag, results);
  }
}
function extractEntityId(node) {
  for (const child of node.children) {
    if (child.tag === "DE05") {
      return parseVarInt(child.payload, 0, child.payload.length);
    }
    if (child.tag === "DC05") {
      const payload = child.payload;
      if (payload.length >= 6 && payload[0] === 222 && payload[1] === 5) {
        const de05Len = readU32(payload, 2);
        return parseVarInt(payload, 6, de05Len);
      } else {
        return parseVarInt(payload, 0, payload.length);
      }
    }
  }
  for (const child of node.children) {
    const res = extractEntityId(child);
    if (res !== null) return res;
  }
  return null;
}
function tlvFlat(payload) {
  let pos = 0;
  const out = [];
  while (pos <= payload.length - 6) {
    const tagBytes = payload.subarray(pos, pos + 2);
    let tagHex = "";
    for (let i2 = 0; i2 < 2; i2++) {
      const h = tagBytes[i2].toString(16).toUpperCase();
      tagHex += h.length === 1 ? "0" + h : h;
    }
    const size = readU32(payload, pos + 2);
    if (pos + 6 + size > payload.length) break;
    out.push([tagHex, payload.subarray(pos + 6, pos + 6 + size)]);
    pos += 6 + size;
  }
  return out;
}
function findFlat(seq, tag) {
  for (const [t, body] of seq) {
    if (t === tag) return body;
  }
  return null;
}
function extractUvTransforms(dc05Payload) {
  const dd05 = findFlat(tlvFlat(dc05Payload), "DD05");
  if (dd05 === null) return [null, null];
  const b136 = findFlat(tlvFlat(dd05), "B136");
  if (b136 === null) return [null, null];
  const b236 = findFlat(tlvFlat(b136), "B236");
  if (b236 === null) return [null, null];
  const t1027 = findFlat(tlvFlat(b236), "1027");
  if (t1027 === null) return [null, null];
  const sides = tlvFlat(t1027);
  const result = [];
  for (const sideTag of ["1127", "1227"]) {
    const side = findFlat(sides, sideTag);
    let mat = null;
    if (side !== null) {
      const t1327 = findFlat(tlvFlat(side), "1327");
      if (t1327 !== null) {
        const t1527 = findFlat(tlvFlat(t1327), "1527");
        if (t1527 !== null && t1527.length === 72) {
          mat = [];
          for (let i2 = 0; i2 < 9; i2++) {
            mat.push(readF64(t1527, i2 * 8));
          }
        }
      }
    }
    result.push(mat);
  }
  return [result[0], result[1]];
}
function extractGeometryFromNodes(elements, builder, options) {
  for (const el of elements) {
    const tag = el.tag;
    if (tag === "C409") {
      const vId = extractEntityId(el);
      const c509 = findChildTag(el.children, "C509");
      if (vId !== null && c509 && c509.payload.length >= 24) {
        const x2 = readF64(c509.payload, 0);
        const y = readF64(c509.payload, 8);
        const z = readF64(c509.payload, 16);
        builder.vertices.set(vId, [x2, y, z]);
      }
    } else if (tag === "B80B") {
      const eId = extractEntityId(el);
      if (eId !== null) {
        const v1Node = findChildTag(el.children, "B90B");
        const v2Node = findChildTag(el.children, "BA0B");
        const v1 = v1Node ? parseVarInt(v1Node.payload, 0, v1Node.payload.length) : null;
        const v2 = v2Node ? parseVarInt(v2Node.payload, 0, v2Node.payload.length) : null;
        builder.edges.set(eId, [v1, v2]);
        const d007 = el.children.find((c) => c.tag === "D007");
        if (d007) {
          const d307 = d007.children.find((c) => c.tag === "D307");
          if (d307 && d307.payload.length > 0) {
            builder.edgeFlags.set(eId, d307.payload[0]);
          }
        }
      }
    } else if (tag === "AC0D") {
      const fId = extractEntityId(el);
      if (fId !== null) {
        let normal = [0, 0, 1];
        const ad0d = findChildTag(el.children, "AD0D");
        if (ad0d && ad0d.payload.length >= 24) {
          const nx = readF64(ad0d.payload, 0);
          const ny = readF64(ad0d.payload, 8);
          const nz = readF64(ad0d.payload, 16);
          normal = [nx, ny, nz];
        }
        const ae0d = findChildTag(el.children, "AE0D");
        const loops = [];
        if (ae0d) {
          const loopNodes = [];
          findAllNodesRec(ae0d.children, "9411", loopNodes);
          for (const ln2 of loopNodes) {
            const coEdges = [];
            const coNodes = [];
            findAllNodesRec(ln2.children, "A00F", coNodes);
            for (const cn of coNodes) {
              const payload = cn.payload;
              let edgeId = null;
              let orient = null;
              let subPos = 0;
              while (subPos < payload.length - 6) {
                const subSize = readU32(payload, subPos + 2);
                if (subPos + 6 + subSize <= payload.length) {
                  const val = parseVarInt(payload, subPos + 6, subSize);
                  if (payload[subPos] === 161 && payload[subPos + 1] === 15) {
                    edgeId = val;
                  } else if (payload[subPos] === 162 && payload[subPos + 1] === 15) {
                    orient = val;
                  }
                }
                subPos += 6 + subSize;
              }
              if (edgeId !== null && orient !== null) {
                coEdges.push({ edgeId, orientation: orient === 0 ? 1 : -1 });
              }
            }
            if (coEdges.length > 0) {
              loops.push(coEdges);
            }
          }
        }
        let faceMatId = null;
        let uvFront = null;
        let uvBack = null;
        let faceHidden = false;
        const d007 = el.children.find((c) => c.tag === "D007");
        if (d007) {
          const d107 = d007.children.find((c) => c.tag === "D107");
          if (d107) {
            faceMatId = parseVarInt(d107.payload, 0, d107.payload.length);
          }
          const dc05 = d007.children.find((c) => c.tag === "DC05");
          if (dc05) {
            [uvFront, uvBack] = extractUvTransforms(dc05.payload);
          }
          const d307 = d007.children.find((c) => c.tag === "D307");
          if (d307 && d307.payload.length > 0) {
            faceHidden = (d307.payload[0] & 1) !== 0;
          }
        }
        let backMatId = null;
        const af0d = el.children.find((c) => c.tag === "AF0D");
        if (af0d && af0d.payload.length > 0) {
          backMatId = parseVarInt(af0d.payload, 0, af0d.payload.length);
        }
        builder.faces.set(fId, {
          loops,
          normal,
          materialId: faceMatId,
          backMaterialId: backMatId,
          uvTransform: uvFront,
          uvTransformBack: uvBack,
          hidden: faceHidden
        });
      }
    } else if (tag === "6419") {
      const nodesToSearch = el.children.length > 0 ? el.children : [el];
      let guid = null;
      let defIdx = null;
      let name = null;
      const matrix = [];
      const guidNode = findChildTag(nodesToSearch, "6819");
      if (guidNode && guidNode.payload.length === 16) {
        let hex = "";
        for (let i2 = 0; i2 < 16; i2++) {
          const h = guidNode.payload[i2].toString(16).toUpperCase();
          hex += h.length === 1 ? "0" + h : h;
        }
        guid = hex;
      }
      const defIdxNode = findChildTag(nodesToSearch, "6719");
      if (defIdxNode) {
        defIdx = parseVarInt(defIdxNode.payload, 0, defIdxNode.payload.length);
      }
      const nameNode = findChildTag(nodesToSearch, "6519");
      if (nameNode) {
        try {
          const decoder = new TextDecoder("utf-8");
          name = decoder.decode(nameNode.payload).replace(/\0/g, "").trim();
        } catch (e) {
          name = "";
          emitLog(options, "debug", `Failed to decode instance name: ${e.message}`);
        }
      }
      const matNode = findChildTag(nodesToSearch, "6619");
      if (matNode && matNode.payload.length >= 104) {
        for (let idx = 0; idx < 13; idx++) {
          matrix.push(readF64(matNode.payload, idx * 8));
        }
      }
      let instMatId = null;
      let instLayerId = null;
      let instHidden = false;
      const d007 = el.children.find((c) => c.tag === "D007");
      if (d007) {
        const d107 = d007.children.find((c) => c.tag === "D107");
        if (d107) {
          instMatId = parseVarInt(d107.payload, 0, d107.payload.length);
        }
        const d207 = d007.children.find((c) => c.tag === "D207");
        if (d207 && d207.payload.length > 0) {
          const p = d207.payload;
          instLayerId = p.length === 1 ? p[0] : parseVarInt(p, 0, p.length);
        }
        const d307 = d007.children.find((c) => c.tag === "D307");
        if (d307 && d307.payload.length > 0) {
          instHidden = (d307.payload[0] & 1) !== 0;
        }
      }
      builder.instances.push({
        offset: el.offset,
        refGuid: guid || "",
        refIdx: defIdx !== null ? defIdx : -1,
        name: name || "",
        matrix,
        materialId: instMatId,
        layerId: instLayerId,
        hidden: instHidden,
        children: el.children
      });
    } else if (el.children && el.children.length > 0) {
      extractGeometryFromNodes(el.children, builder, options);
    }
  }
}
function collectLayers(nodes, layerIdToName = /* @__PURE__ */ new Map(), options, layerHidden) {
  for (const el of nodes) {
    if (el.tag === "993A") {
      for (const child of el.children) {
        if (child.tag === "8C3C") {
          const dc05 = findChildTag(child.children, "DC05");
          const nameNode = findChildTag(child.children, "8D3C");
          if (dc05 && nameNode) {
            const payload = dc05.payload;
            let lId;
            if (payload.length >= 6 && payload[0] === 222 && payload[1] === 5) {
              const de05Len = readU32(payload, 2);
              lId = parseVarInt(payload, 6, de05Len);
            } else {
              lId = parseVarInt(payload, 0, payload.length);
            }
            let lName = "";
            try {
              const decoder = new TextDecoder("utf-8");
              lName = decoder.decode(nameNode.payload).replace(/\0/g, "").trim();
            } catch (e) {
              emitLog(options, "debug", `Failed to decode layer name for id ${lId}: ${e.message}`);
            }
            layerIdToName.set(lId, lName);
            if (layerHidden) {
              const hiddenNode = findChildTag(child.children, "8E3C");
              if (hiddenNode && hiddenNode.payload.length > 0) {
                layerHidden.set(lName, hiddenNode.payload[0] === 1);
              }
            }
          }
        }
      }
    }
    if (el.children && el.children.length > 0) {
      collectLayers(el.children, layerIdToName, options, layerHidden);
    }
  }
  return layerIdToName;
}
function collectDefs(nodes, defsDict = /* @__PURE__ */ new Map(), options) {
  for (const el of nodes) {
    if (el.tag === "7C15") {
      let guid = null;
      let name = null;
      let isImage = false;
      let facesCamera = false;
      let shadowsFaceSun = false;
      for (const child of el.children) {
        if (child.tag === "7D15" && child.payload.length === 16) {
          let hex = "";
          for (let i2 = 0; i2 < 16; i2++) {
            const h = child.payload[i2].toString(16).toUpperCase();
            hex += h.length === 1 ? "0" + h : h;
          }
          guid = hex;
        } else if (child.tag === "7E15") {
          try {
            const decoder = new TextDecoder("utf-8");
            name = decoder.decode(child.payload).replace(/\0/g, "").trim();
          } catch (e) {
            name = "";
            emitLog(options, "debug", `Failed to decode definition name: ${e.message}`);
          }
        } else if (child.tag === "8315" && child.payload.length > 0) {
          isImage = parseVarInt(child.payload, 0, child.payload.length) === 2;
        } else if (child.tag === "581B") {
          let pos = 0;
          const pl = child.payload;
          while (pos <= pl.length - 6) {
            const subSize = readU32(pl, pos + 2);
            if (pos + 6 + subSize > pl.length) break;
            if (pl[pos] === 93 && pl[pos + 1] === 27 && subSize >= 1) {
              facesCamera = parseVarInt(pl, pos + 6, subSize) === 1;
            } else if (pl[pos] === 94 && pl[pos + 1] === 27 && subSize >= 1) {
              shadowsFaceSun = parseVarInt(pl, pos + 6, subSize) === 1;
            }
            pos += 6 + subSize;
          }
        }
      }
      const entId = extractEntityId(el);
      if (entId !== null) {
        const builder = new GeometryBuilder();
        extractGeometryFromNodes(el.children, builder, options);
        defsDict.set(entId, {
          guid: guid || "",
          name: name || "",
          isImage,
          alwaysFacesCamera: facesCamera,
          shadowsFaceSun,
          builder
        });
      }
    }
    if (el.children && el.children.length > 0) {
      collectDefs(el.children, defsDict, options);
    }
  }
  return defsDict;
}
function extractDynamicProperties(d007, options) {
  const dc05 = d007.children.find((c) => c.tag === "DC05");
  if (!dc05) {
    return {};
  }
  const propContainerTags = /* @__PURE__ */ new Set([
    "DD05",
    "B536",
    "B136",
    "B236",
    "B336",
    "B036",
    "A438"
  ]);
  const propElements = parseTlvRecursive(
    dc05.payload,
    0,
    dc05.payload.length,
    propContainerTags
  );
  const properties = {};
  let currentKey = null;
  function extractProps(nodes) {
    for (const n of nodes) {
      const tag = n.tag;
      if (tag === "B636") {
        try {
          const decoder = new TextDecoder("utf-8");
          currentKey = decoder.decode(n.payload).replace(/\0/g, "").trim();
        } catch (e) {
          currentKey = null;
          emitLog(options, "debug", `Failed to decode dynamic property key: ${e.message}`);
        }
      } else if (tag === "AD38" && currentKey) {
        try {
          const decoder = new TextDecoder("utf-8");
          const val = decoder.decode(n.payload).replace(/\0/g, "").trim();
          properties[currentKey] = val;
        } catch (e) {
          emitLog(
            options,
            "debug",
            `Failed to decode dynamic property value for key ${currentKey}: ${e.message}`
          );
        }
        currentKey = null;
      }
      if (n.children && n.children.length > 0) {
        extractProps(n.children);
      }
    }
  }
  extractProps(propElements);
  return properties;
}
var VFF_ATTR_DOUBLE_TAGS = /* @__PURE__ */ new Set(["AF38", "A938"]);
function decodeVffAttrValue(a438Node) {
  if (!a438Node.children || a438Node.children.length === 0) return null;
  const child = a438Node.children[0];
  const tag = child.tag;
  const payload = child.payload;
  if (tag === "AD38") {
    try {
      return new TextDecoder("utf-8").decode(payload).replace(/\0/g, "").trim();
    } catch {
      return null;
    }
  }
  if (VFF_ATTR_DOUBLE_TAGS.has(tag) && payload.length === 8) return readF64(payload, 0);
  if (tag === "A738" && payload.length === 4) return readI32(payload, 0);
  if ((tag === "B438" || tag === "B538") && payload.length === 24) {
    return [readF64(payload, 0), readF64(payload, 8), readF64(payload, 16)];
  }
  if (tag === "AE38") {
    return (child.children ?? []).map(decodeVffAttrValue);
  }
  return null;
}
function stringifyVffAttrValue(value) {
  if (value === null || value === void 0) return "";
  if (Array.isArray(value)) {
    return value.map((v) => stringifyVffAttrValue(v)).join(",");
  }
  return String(value);
}
function extractAttributeDictionaries(d007, options) {
  const dictionaries = {};
  const dc05 = d007.children.find((c) => c.tag === "DC05");
  if (!dc05) {
    return dictionaries;
  }
  const propContainerTags = /* @__PURE__ */ new Set([
    "DD05",
    "B536",
    "B136",
    "B236",
    "B336",
    "B036",
    "A438",
    "AE38"
  ]);
  const propElements = parseTlvRecursive(dc05.payload, 0, dc05.payload.length, propContainerTags);
  let currentKey = null;
  function extractEntries(nodes, entries) {
    for (const n of nodes) {
      const tag = n.tag;
      if (tag === "B636") {
        try {
          const decoder = new TextDecoder("utf-8");
          currentKey = decoder.decode(n.payload).replace(/\0/g, "").trim();
        } catch (e) {
          currentKey = null;
          emitLog(options, "debug", `Failed to decode attribute dictionary key: ${e.message}`);
        }
      } else if (tag === "A438" && currentKey) {
        entries[currentKey] = decodeVffAttrValue(n);
        currentKey = null;
      } else if (n.children && n.children.length > 0) {
        extractEntries(n.children, entries);
      }
    }
  }
  function walk2(nodes) {
    for (let i2 = 0; i2 < nodes.length; i2++) {
      if (nodes[i2].tag === "B436") {
        let name = "";
        try {
          const decoder = new TextDecoder("utf-8");
          name = decoder.decode(nodes[i2].payload).replace(/\0/g, "").trim();
        } catch (e) {
          emitLog(options, "debug", `Failed to decode attribute dictionary name: ${e.message}`);
        }
        const entries = {};
        currentKey = null;
        if (i2 + 1 < nodes.length && nodes[i2 + 1].children) {
          extractEntries(nodes[i2 + 1].children, entries);
        }
        dictionaries[name] = entries;
      } else if (nodes[i2].children && nodes[i2].children.length > 0) {
        walk2(nodes[i2].children);
      }
    }
  }
  walk2(propElements);
  return dictionaries;
}
var GENERIC_DEFINITION_NAME_PATTERN = /^(?:Group|Component)\d*#\d+$/;
function isGenericDefinitionName(name) {
  return GENERIC_DEFINITION_NAME_PATTERN.test(name);
}
var NAME_OVERRIDE_KEYS = ["name", "label", "code"];
function findNameOverride(attributeDicts) {
  if (!attributeDicts) return null;
  for (const dictName of Object.keys(attributeDicts)) {
    if (dictName === "dynamic_attributes" || dictName === "SU_InstanceSet") continue;
    const entries = attributeDicts[dictName];
    for (const key of NAME_OVERRIDE_KEYS) {
      if (!(key in entries)) continue;
      const val = stringifyVffAttrValue(entries[key]);
      if (val) return val;
    }
  }
  return null;
}
function reconstructLoopVertices(loop, edges) {
  const loopVerts = [];
  for (const { edgeId, orientation } of loop) {
    const edge = edges.get(edgeId);
    if (edge) {
      const [v1, v2] = edge;
      const vStart = orientation === 1 ? v1 : v2;
      if (vStart !== null) {
        if (loopVerts.length === 0 || loopVerts[loopVerts.length - 1] !== vStart) {
          loopVerts.push(vStart);
        }
      }
    }
  }
  if (loopVerts.length > 1 && loopVerts[0] === loopVerts[loopVerts.length - 1]) {
    loopVerts.pop();
  }
  return loopVerts;
}
function decodeXmlEntities(value) {
  return value.replace(/&(lt|gt|amp|apos|quot|#\d+|#x[0-9a-fA-F]+);/g, (whole, entity) => {
    switch (entity) {
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "amp":
        return "&";
      case "apos":
        return "'";
      case "quot":
        return '"';
      default:
        if (entity[0] === "#") {
          const codePoint = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
          return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole;
        }
        return whole;
    }
  });
}
function parseMaterialXml(xmlText) {
  const match = xmlText.match(/<(?:[a-zA-Z0-9_]+:)?material\b([^>]*)\/?>/);
  if (!match) return null;
  const attrsString = match[1];
  const getAttr = (name2) => {
    const attrRegex = new RegExp(`\\b${name2}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
    const m = attrsString.match(attrRegex);
    const raw = m ? m[1] !== void 0 ? m[1] : m[2] : null;
    return raw === null ? null : decodeXmlEntities(raw);
  };
  const name = getAttr("name") || "unknown";
  const colorRed = parseInt(getAttr("colorRed") || "128", 10);
  const colorGreen = parseInt(getAttr("colorGreen") || "128", 10);
  const colorBlue = parseInt(getAttr("colorBlue") || "128", 10);
  let trans;
  if (getAttr("useTrans") === "1") {
    const rawTrans = parseFloat(getAttr("trans") || "0");
    trans = Math.min(Math.max(1 - rawTrans, 0), 1);
  } else {
    trans = 1;
  }
  const colorized = getAttr("type") === "2";
  const colorizeTypeRaw = parseInt(getAttr("colorizeType") || "0", 10);
  const colorizeType = Number.isNaN(colorizeTypeRaw) ? 0 : colorizeTypeRaw;
  const textureMatch = xmlText.match(/<(?:[a-zA-Z0-9_]+:)?texture\b([^>]*)\/?>/);
  let hasTexture = false;
  let textureFilename = "";
  let xScale = 0;
  let yScale = 0;
  if (textureMatch) {
    hasTexture = true;
    const texAttrs = textureMatch[1];
    const getTexAttr = (n) => {
      const r = new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
      const m = texAttrs.match(r);
      const raw = m ? m[1] !== void 0 ? m[1] : m[2] : null;
      return raw === null ? null : decodeXmlEntities(raw);
    };
    textureFilename = getTexAttr("textureFilename") || "";
    const xs = parseFloat(getTexAttr("xScale") || "0");
    xScale = Number.isNaN(xs) ? 0 : xs;
    const ys = parseFloat(getTexAttr("yScale") || "0");
    yScale = Number.isNaN(ys) ? 0 : ys;
  }
  const imageMatch = xmlText.match(
    /<(?:[a-zA-Z0-9_]+:)?image\b[^>]*\bpath\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\/?>/
  );
  const imagePath = imageMatch ? decodeXmlEntities(imageMatch[1] !== void 0 ? imageMatch[1] : imageMatch[2]) : "";
  return {
    name,
    r: colorRed,
    g: colorGreen,
    b: colorBlue,
    trans,
    colorized,
    colorizeType,
    hasTexture,
    textureFilename,
    xScale,
    yScale,
    imagePath
  };
}
function parseStyleXml(xmlText) {
  const styleMatch = xmlText.match(/<(?:[a-zA-Z0-9_]+:)?style\b([^>]*)>/);
  if (!styleMatch) return null;
  const attrsString = styleMatch[1];
  const nameMatch = attrsString.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/);
  const name = nameMatch ? nameMatch[1] !== void 0 ? nameMatch[1] : nameMatch[2] : "";
  const colors = {};
  const itemRegex = /<(?:[a-zA-Z0-9_]+:)?item\s+id\s*=\s*(?:"(\d+)"|'(\d+)')[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?item>/g;
  let m;
  while ((m = itemRegex.exec(xmlText)) !== null) {
    const id = m[1] !== void 0 ? m[1] : m[2];
    if (id !== "4000" && id !== "4001") continue;
    const inner = m[3];
    const variantMatch = inner.match(/<(?:[a-zA-Z0-9_]+:)?variant\b[^>]*>(-?\d+)<\/(?:[a-zA-Z0-9_]+:)?variant>/);
    if (!variantMatch) continue;
    const raw = parseInt(variantMatch[1], 10);
    if (Number.isNaN(raw)) continue;
    const v = raw >>> 0;
    colors[id] = [v >> 16 & 255, v >> 8 & 255, v & 255];
  }
  return {
    name,
    frontColor: colors["4000"] ?? null,
    backColor: colors["4001"] ?? null
  };
}
function lstripChars(s, chars) {
  let i2 = 0;
  while (i2 < s.length && chars.includes(s[i2])) i2++;
  return s.slice(i2);
}
function resolveTextureBytes(materialFiles, xmlName, filename, imagePath) {
  const names = Object.keys(materialFiles);
  const slashIdx = xmlName.lastIndexOf("/");
  const folder = slashIdx >= 0 ? xmlName.slice(0, slashIdx) : "";
  let data = null;
  let resolvedFilename = filename;
  const candidate = filename ? `${folder}/${filename}` : null;
  if (candidate && names.includes(candidate)) {
    data = materialFiles[candidate];
  } else {
    for (const entry of names) {
      if (entry.startsWith(folder + "/") && entry !== xmlName && !entry.toLowerCase().endsWith(".xml")) {
        data = materialFiles[entry];
        if (!resolvedFilename) {
          resolvedFilename = entry.split("/").pop() || "";
        }
        break;
      }
    }
  }
  if (data === null) {
    const imgPath = lstripChars(imagePath, "./");
    const candidates = [imgPath, folder ? `${folder}/${imgPath}` : imgPath];
    for (const cand of candidates) {
      if (cand && names.includes(cand)) {
        data = materialFiles[cand];
        if (!resolvedFilename) {
          resolvedFilename = cand.split("/").pop() || "";
        }
        break;
      }
    }
  }
  return { data, filename: resolvedFilename };
}
function transformPoint(matrix, point) {
  if (!matrix || matrix.length < 12) {
    return point;
  }
  const [x2, y, z] = point;
  if (matrix.length === 16) {
    const tx = matrix[0] * x2 + matrix[4] * y + matrix[8] * z + matrix[12];
    const ty = matrix[1] * x2 + matrix[5] * y + matrix[9] * z + matrix[13];
    const tz = matrix[2] * x2 + matrix[6] * y + matrix[10] * z + matrix[14];
    return [tx, ty, tz];
  } else {
    const tx = matrix[0] * x2 + matrix[1] * y + matrix[2] * z + matrix[9];
    const ty = matrix[3] * x2 + matrix[4] * y + matrix[5] * z + matrix[10];
    const tz = matrix[6] * x2 + matrix[7] * y + matrix[8] * z + matrix[11];
    return [tx, ty, tz];
  }
}
function multiplyMatrices(a, b) {
  if (!a || a.length === 0) return b;
  if (!b || b.length === 0) return a;
  if (a.length === 16 && b.length === 16) {
    const result = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let s = 0;
        for (let k = 0; k < 4; k++) {
          s += a[k * 4 + row] * b[col * 4 + k];
        }
        result[col * 4 + row] = s;
      }
    }
    return result;
  } else {
    const aPad = a.length < 13 ? [...a, ...new Array(13 - a.length).fill(0)] : a;
    const bPad = b.length < 13 ? [...b, ...new Array(13 - b.length).fill(0)] : b;
    if (a.length < 13 && aPad[12] === 0) aPad[12] = 1;
    if (b.length < 13 && bPad[12] === 0) bPad[12] = 1;
    const p_r0 = [aPad[0], aPad[1], aPad[2], aPad[9]];
    const p_r1 = [aPad[3], aPad[4], aPad[5], aPad[10]];
    const p_r2 = [aPad[6], aPad[7], aPad[8], aPad[11]];
    const c_c0 = [bPad[0], bPad[3], bPad[6], 0];
    const c_c1 = [bPad[1], bPad[4], bPad[7], 0];
    const c_c2 = [bPad[2], bPad[5], bPad[8], 0];
    const c_c3 = [bPad[9], bPad[10], bPad[11], 1];
    const dot = (row, col) => {
      return row[0] * col[0] + row[1] * col[1] + row[2] * col[2] + row[3] * col[3];
    };
    const out = new Array(13).fill(0);
    out[0] = dot(p_r0, c_c0);
    out[1] = dot(p_r0, c_c1);
    out[2] = dot(p_r0, c_c2);
    out[3] = dot(p_r1, c_c0);
    out[4] = dot(p_r1, c_c1);
    out[5] = dot(p_r1, c_c2);
    out[6] = dot(p_r2, c_c0);
    out[7] = dot(p_r2, c_c1);
    out[8] = dot(p_r2, c_c2);
    out[9] = dot(p_r0, c_c3);
    out[10] = dot(p_r1, c_c3);
    out[11] = dot(p_r2, c_c3);
    out[12] = aPad[12] * bPad[12];
    return out;
  }
}
function triangulateFace3D(vertices3D, loops, normal) {
  if (loops.length === 0) return [];
  if (loops.length === 1 && loops[0].length === 3) {
    return [loops[0]];
  }
  if (loops.length === 1 && loops[0].length === 4) {
    const v = loops[0];
    return [
      [v[0], v[1], v[2]],
      [v[0], v[2], v[3]]
    ];
  }
  let nx = normal[0];
  let ny = normal[1];
  let nz = normal[2];
  const normVal = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (normVal > 1e-6) {
    nx /= normVal;
    ny /= normVal;
    nz /= normVal;
  } else {
    nx = 0;
    ny = 0;
    nz = 1;
  }
  let u_axis;
  if (Math.abs(nx) < 0.9) {
    u_axis = [1, 0, 0];
  } else {
    u_axis = [0, 1, 0];
  }
  let ux = ny * u_axis[2] - nz * u_axis[1];
  let uy = nz * u_axis[0] - nx * u_axis[2];
  let uz = nx * u_axis[1] - ny * u_axis[0];
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  if (uLen < 1e-12) {
    ux = 1;
    uy = 0;
    uz = 0;
  } else {
    ux /= uLen;
    uy /= uLen;
    uz /= uLen;
  }
  let vx = ny * uz - nz * uy;
  let vy = nz * ux - nx * uz;
  let vz = nx * uy - ny * ux;
  const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (vLen > 1e-12) {
    vx /= vLen;
    vy /= vLen;
    vz /= vLen;
  }
  const getVertex = (id) => {
    let pt;
    if (typeof vertices3D.get === "function") {
      pt = vertices3D.get(id);
    } else {
      pt = vertices3D[id];
    }
    if (!pt) return null;
    if (Array.isArray(pt)) {
      return { x: pt[0], y: pt[1], z: pt[2] };
    }
    return pt;
  };
  const loops2d = [];
  for (const loop of loops) {
    const pts = [];
    for (const vId of loop) {
      const pt = getVertex(vId);
      if (!pt) {
        return [];
      }
      pts.push({ u: pt.x * ux + pt.y * uy + pt.z * uz, v: pt.x * vx + pt.y * vy + pt.z * vz });
    }
    loops2d.push(pts);
  }
  if (loops.length > 2 && holesOverlap(loops2d)) {
    return triangulateByFilteringHoles(loops, loops2d);
  }
  const allVIds = [];
  const holeIndices = [];
  let currentOffset = 0;
  for (let l = 0; l < loops.length; l++) {
    if (l > 0) {
      holeIndices.push(currentOffset);
    }
    const loop = loops[l];
    for (const vId of loop) {
      allVIds.push(vId);
    }
    currentOffset += loop.length;
  }
  const flatCoords = [];
  for (const pts of loops2d) {
    for (const { u, v } of pts) {
      flatCoords.push(u, v);
    }
  }
  let triIndices;
  try {
    triIndices = earcut(flatCoords, holeIndices, 2);
  } catch {
    const outerLoop = loops[0];
    const fallback = [];
    for (let i2 = 1; i2 < outerLoop.length - 1; i2++) {
      fallback.push([outerLoop[0], outerLoop[i2], outerLoop[i2 + 1]]);
    }
    return fallback;
  }
  const result = [];
  for (let i2 = 0; i2 < triIndices.length; i2 += 3) {
    const idx0 = triIndices[i2];
    const idx1 = triIndices[i2 + 1];
    const idx2 = triIndices[i2 + 2];
    result.push([
      allVIds[idx0],
      allVIds[idx1],
      allVIds[idx2]
    ]);
  }
  return result;
}
function holesOverlap(loops2d) {
  for (let i2 = 1; i2 < loops2d.length; i2++) {
    for (let j = i2 + 1; j < loops2d.length; j++) {
      if (anyVertexInside(loops2d[i2], loops2d[j]) || anyVertexInside(loops2d[j], loops2d[i2])) {
        return true;
      }
    }
  }
  return false;
}
function anyVertexInside(points, polygon) {
  for (const p of points) {
    if (pointInPolygon(p.u, p.v, polygon)) return true;
  }
  return false;
}
function pointInPolygon(u, v, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i2 = 0, j = n - 1; i2 < n; j = i2++) {
    const ui = polygon[i2].u, vi = polygon[i2].v;
    const uj = polygon[j].u, vj = polygon[j].v;
    const intersects2 = vi > v !== vj > v && u < (uj - ui) * (v - vi) / (vj - vi) + ui;
    if (intersects2) inside = !inside;
  }
  return inside;
}
function triangulateByFilteringHoles(loops, loops2d) {
  const outerLoop = loops[0];
  const outer2d = loops2d[0];
  const flatOuter = [];
  for (const { u, v } of outer2d) {
    flatOuter.push(u, v);
  }
  let triIndices;
  try {
    triIndices = earcut(flatOuter, [], 2);
  } catch {
    const fallback = [];
    for (let i2 = 1; i2 < outerLoop.length - 1; i2++) {
      fallback.push([outerLoop[0], outerLoop[i2], outerLoop[i2 + 1]]);
    }
    return fallback;
  }
  const result = [];
  for (let i2 = 0; i2 < triIndices.length; i2 += 3) {
    const ia = triIndices[i2], ib = triIndices[i2 + 1], ic = triIndices[i2 + 2];
    const cu = (outer2d[ia].u + outer2d[ib].u + outer2d[ic].u) / 3;
    const cv = (outer2d[ia].v + outer2d[ib].v + outer2d[ic].v) / 3;
    let insideAnyHole = false;
    for (let h = 1; h < loops2d.length; h++) {
      if (pointInPolygon(cu, cv, loops2d[h])) {
        insideAnyHole = true;
        break;
      }
    }
    if (insideAnyHole) continue;
    result.push([outerLoop[ia], outerLoop[ib], outerLoop[ic]]);
  }
  return result;
}
function buildLocalFaceGroups(builder, ctx) {
  const faceGroups = /* @__PURE__ */ new Map();
  const addSide = (triangles, fn, color, doubleSided, reverse, mat, uvTransform, xr, yr) => {
    const texIndex = ctx.textureIndexFor(mat?.texture);
    const colorAlpha = color.a !== void 0 ? color.a / 255 : 1;
    const transparency = colorAlpha * (mat?.transparency ?? 1);
    const colorKey = `${color.r},${color.g},${color.b},${doubleSided},${texIndex ?? -1},${transparency}`;
    let group = faceGroups.get(colorKey);
    if (!group) {
      group = {
        color,
        transparency,
        doubleSided,
        textureIndex: texIndex,
        localVerts: [],
        localUvs: [],
        normalsAccum: [],
        localFaces: [],
        localVMap: /* @__PURE__ */ new Map()
      };
      faceGroups.set(colorKey, group);
    }
    const tex = mat?.texture;
    const tileW = tex && tex.width > 1e-9 ? tex.width : 1;
    const tileH = tex && tex.height > 1e-9 ? tex.height : 1;
    const sideNormal = reverse ? [-fn[0], -fn[1], -fn[2]] : fn;
    const faceLocalMap = /* @__PURE__ */ new Map();
    for (const tri of triangles) {
      const triIds = reverse ? [tri[0], tri[2], tri[1]] : tri;
      const faceIndices = [];
      for (const vId of triIds) {
        if (!builder.vertices.has(vId)) continue;
        let idx = faceLocalMap.get(vId);
        if (idx === void 0) {
          const p = builder.vertices.get(vId);
          const [u, v] = computeFaceUv(p, xr, yr, uvTransform, tileW, tileH);
          const key = `${vId},${u},${v}`;
          idx = group.localVMap.get(key);
          if (idx === void 0) {
            group.localVerts.push(p);
            group.localUvs.push([u, v]);
            group.normalsAccum.push([sideNormal[0], sideNormal[1], sideNormal[2]]);
            idx = group.localVerts.length - 1;
            group.localVMap.set(key, idx);
          } else {
            const accum = group.normalsAccum[idx];
            accum[0] += sideNormal[0];
            accum[1] += sideNormal[1];
            accum[2] += sideNormal[2];
          }
          faceLocalMap.set(vId, idx);
        }
        faceIndices.push(idx);
      }
      if (faceIndices.length === 3) {
        group.localFaces.push(faceIndices);
      }
    }
  };
  for (const [_fId, fData] of builder.faces.entries()) {
    if (ctx.respectVisibility && fData.hidden) continue;
    const fallbackColor = ctx.inheritedMaterial?.color ?? ctx.fallbackLayerColor;
    const frontMat = ctx.resolveMaterial(fData.materialId) ?? ctx.inheritedMaterial;
    const backMat = ctx.resolveMaterial(fData.backMaterialId) ?? ctx.inheritedMaterial;
    const frontColor = frontMat?.color ?? fallbackColor;
    const backColor = backMat?.color ?? fallbackColor;
    const loops = [];
    for (const loop of fData.loops) {
      const loopVerts = reconstructLoopVertices(loop, builder.edges);
      if (loopVerts.length > 0) {
        loops.push(loopVerts);
      }
    }
    if (loops.length === 0) continue;
    let triangles;
    try {
      triangles = triangulateFace3D(builder.vertices, loops, fData.normal);
    } catch (e) {
      throw new SkpParseError(`Failed to triangulate face: ${e.message}`, {
        stage: "build_scene",
        definitionId: ctx.definitionId,
        cause: e
      });
    }
    const fn = fData.normal;
    const { xr, yr } = faceUvBasis(fn);
    const uvTransform = fData.uvTransform;
    const uvTransformBack = fData.uvTransformBack;
    const sameColor = frontColor.r === backColor.r && frontColor.g === backColor.g && frontColor.b === backColor.b;
    if (sameColor) {
      addSide(triangles, fn, frontColor, true, false, frontMat, uvTransform, xr, yr);
    } else {
      addSide(triangles, fn, frontColor, false, false, frontMat, uvTransform, xr, yr);
      addSide(triangles, fn, backColor, false, true, backMat, uvTransformBack, xr, yr);
    }
  }
  return faceGroups;
}
function sniffImageMime(data) {
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) {
    return "image/jpeg";
  }
  if (data.length >= 8 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71 && data[4] === 13 && data[5] === 10 && data[6] === 26 && data[7] === 10) {
    return "image/png";
  }
  return null;
}
function invertMatrix3x3(m) {
  const [a, b, c, d, e, f, g, h, i2] = m;
  const det = a * (e * i2 - f * h) - b * (d * i2 - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const invDet = 1 / det;
  return [
    (e * i2 - f * h) * invDet,
    (c * h - b * i2) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i2) * invDet,
    (a * i2 - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet
  ];
}
function faceUvBasis(n) {
  const [nx, ny, nz] = n;
  const cx = -ny;
  const cy = nx;
  const clen2 = Math.sqrt(cx * cx + cy * cy);
  let xr;
  let yr;
  if (clen2 < 1e-9) {
    xr = [1, 0, 0];
    yr = [0, nz >= 0 ? 1 : -1, 0];
  } else {
    xr = [cx / clen2, cy / clen2, 0];
    yr = [ny * xr[2] - nz * xr[1], nz * xr[0] - nx * xr[2], nx * xr[1] - ny * xr[0]];
  }
  return { xr, yr };
}
function computeFaceUv(p, xr, yr, uvTransform, tileW, tileH) {
  const px = p[0] * xr[0] + p[1] * xr[1] + p[2] * xr[2];
  const py = p[0] * yr[0] + p[1] * yr[1] + p[2] * yr[2];
  if (!uvTransform) {
    return [px / tileW, py / tileH];
  }
  const inv = invertMatrix3x3(uvTransform);
  const u = px * inv[0] + py * inv[3] + inv[6];
  const v = px * inv[1] + py * inv[4] + inv[7];
  let q = px * inv[2] + py * inv[5] + inv[8];
  if (Math.abs(q) < 1e-12) q = 1;
  return [u / q / tileW, v / q / tileH];
}
function resolveMaterialFromMaps(matId, materialIdToName, materialsMap, materialsByFolder) {
  if (matId === void 0 || matId === null) return void 0;
  const matName = materialIdToName.get(matId);
  if (!matName) return void 0;
  return materialsMap.get(matName) || materialsByFolder.get(matName);
}
var LegacyParseError = class extends Error {
};
var STR_MARKER = new Uint8Array([255, 254, 255]);
var MAX_V20_FILLER_PAD = 29;
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i2 = 0; i2 < a.length; i2++) if (a[i2] !== b[i2]) return false;
  return true;
}
function findCountAfterV20Filler(data, countPos, limit, ar) {
  let markerAt = -1;
  for (let i2 = countPos; i2 < countPos + 12 && i2 + 4 <= data.length; i2++) {
    if (data[i2] === 255 && data[i2 + 1] === 254 && data[i2 + 2] === 255) {
      markerAt = i2;
      break;
    }
  }
  if (markerAt < 0) return null;
  if (data[markerAt + 3] !== 0) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let pad = 1; pad <= MAX_V20_FILLER_PAD; pad += 4) {
    const at = markerAt + 4 + pad;
    if (at + 4 > data.length) break;
    const count = view.getUint32(at, true);
    if (count > 0 && count <= limit && (ar === void 0 || plausibleListTag(ar, data, at + 4))) {
      return { count, next: at + 4 };
    }
  }
  return null;
}
function retryCountAfterV20Filler(r, countPos, limit, ar) {
  const hit = findCountAfterV20Filler(r.data, countPos, limit, ar);
  if (hit === null) return null;
  r.pos = hit.next;
  return hit.count;
}
function plausibleListTag(ar, data, at) {
  if (at + 2 > data.length) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const t = view.getUint16(at, true);
  if (t === 0 || t === 32767 || t === 65535) return true;
  if (t & 32768) {
    const ent = ar.slots.get(t & 32767);
    return ent !== void 0 && ent[0] === "class";
  }
  return t < ar.nextSlot;
}
function findBytes(data, needle, start = 0, end = data.length) {
  const nlen = needle.length;
  const limit = end - nlen;
  outer: for (let i2 = start; i2 <= limit; i2++) {
    for (let j = 0; j < nlen; j++) {
      if (data[i2 + j] !== needle[j]) continue outer;
    }
    return i2;
  }
  return -1;
}
function findPattern(data, pattern, start = 0, end = data.length) {
  const patLen = pattern.length;
  const limit = end - patLen;
  outer: for (let i2 = start; i2 <= limit; i2++) {
    for (let j = 0; j < patLen; j++) {
      const want = pattern[j];
      if (want !== null && data[i2 + j] !== want) continue outer;
    }
    return i2;
  }
  return -1;
}
function asciiBytes(s) {
  return s.split("").map((c) => c.charCodeAt(0));
}
function matchesAscii(data, offset, str) {
  if (offset + str.length > data.length) return false;
  for (let i2 = 0; i2 < str.length; i2++) {
    if (data[offset + i2] !== str.charCodeAt(i2)) return false;
  }
  return true;
}
function toHex(data) {
  let s = "";
  for (let i2 = 0; i2 < data.length; i2++) {
    const h = data[i2].toString(16).toUpperCase();
    s += h.length === 1 ? "0" + h : h;
  }
  return s;
}
function isClassRef(data, p, slot) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (slot <= 32767) {
    return p + 2 <= data.length && view.getUint16(p, true) === (32768 | slot);
  }
  return p + 6 <= data.length && view.getUint16(p, true) === 32767 && view.getUint32(p + 2, true) === (2147483648 | slot) >>> 0;
}
var R = class {
  constructor(data, pos = 0) {
    this.data = data;
    this.pos = pos;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  u8() {
    const v = this.data[this.pos];
    this.pos += 1;
    return v;
  }
  u16() {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32() {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f64() {
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
  f64s(n) {
    const out = [];
    for (let i2 = 0; i2 < n; i2++) out.push(this.f64());
    return out;
  }
  raw(n) {
    const v = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }
  peek(n) {
    return this.data.subarray(this.pos, this.pos + n);
  }
  peekU16() {
    return this.view.getUint16(this.pos, true);
  }
  utf16() {
    if (!bytesEqual(this.peek(3), STR_MARKER)) {
      throw new LegacyParseError(`expected a string record ${this.ctx()}`);
    }
    this.pos += 3;
    let n = this.u8();
    if (n === 255) {
      n = this.u16();
      if (n === 65535) {
        n = this.u32();
      }
    }
    const bytes = this.raw(2 * n);
    return new TextDecoder("utf-16le").decode(bytes);
  }
  ctx(back = 16, fwd = 32) {
    const p = this.pos;
    const before = toHex(this.data.subarray(Math.max(0, p - back), p));
    const after = toHex(this.data.subarray(p, p + fwd));
    return `@0x${p.toString(16)}: ...${before} | ${after}...`;
  }
};
var Archive = class {
  constructor(data, ver) {
    this.slots = /* @__PURE__ */ new Map();
    this.classSlot = /* @__PURE__ */ new Map();
    this.classSchema = /* @__PURE__ */ new Map();
    this.currentClass = null;
    this.nextSlot = 0;
    this.walkBase = 0;
    this.readers = {};
    this.currentLoop = null;
    this.inEntityList = false;
    this.burns = [];
    this.cumDelta = 0;
    this.annotWatermark = null;
    this.burnStack = [];
    this.clineTail = null;
    this.data = data;
    this.ver = ver;
    this.hasPid = ver >= 17;
    this.r = new R(data);
  }
  alloc(entry) {
    const s = this.nextSlot;
    this.slots.set(s, entry);
    this.nextSlot += 1;
    return s;
  }
  readObject(r, expect = null) {
    const tag = r.u16();
    if (tag === 0) {
      return [null, null, null];
    }
    if (tag === 32767) {
      const big = r.u32();
      if (big & 2147483648) {
        return this.newOfClass(r, big & 2147483647, expect);
      }
      return this.backref(big, r);
    }
    if (tag === 65535) {
      const schema = r.u16();
      const namelen = r.u16();
      if (namelen > 40) {
        throw new LegacyParseError(`implausible class name length ${r.ctx()}`);
      }
      const nameBytes = r.raw(namelen);
      const name = new TextDecoder("utf-8").decode(nameBytes);
      this.alloc(["class", name, schema]);
      this.classSlot.set(name, this.nextSlot - 1);
      this.classSchema.set(name, schema);
      return this.newObj(r, name);
    }
    if (tag & 32768) {
      return this.newOfClass(r, tag & 32767, expect);
    }
    return this.backref(tag, r);
  }
  newOfClass(r, cslot, expect) {
    let ent = this.slots.get(cslot);
    if (ent === void 0) {
      if (expect === null) {
        throw new LegacyParseError(`class-ref to unknown slot ${cslot} ${r.ctx()}`);
      }
      const newEnt = ["class", expect, null];
      this.slots.set(cslot, newEnt);
      this.classSlot.set(expect, cslot);
      ent = newEnt;
    }
    if (ent[0] !== "class") {
      throw new LegacyParseError(`class-ref to non-class slot ${cslot} (${ent[1]}) ${r.ctx()}`);
    }
    return this.newObj(r, ent[1]);
  }
  newObj(r, name) {
    this.inEntityList = false;
    const slot = this.alloc(["obj", name, null]);
    const reader = this.readers[name];
    if (reader === void 0) {
      throw new LegacyParseError(`no reader for class ${name} ${r.ctx()}`);
    }
    const prevClass = this.currentClass;
    this.currentClass = name;
    let value;
    try {
      value = reader(this, r);
    } finally {
      this.currentClass = prevClass;
    }
    this.slots.set(slot, ["obj", name, value]);
    if (name === "CDimensionLinear" || name === "CText") {
      this.annotWatermark = this.nextSlot;
    }
    return [slot, name, value];
  }
  /** Map a FILE store-map index to the walker's numbering through the burn
   * bands. Returns the walker slot, or `null` when the reference points
   * INTO a band (a phantom, never-serialized connection point). */
  translateRef(slot) {
    let offset = 0;
    for (const [start, width] of this.burns) {
      if (slot < start) break;
      if (slot < start + width) return null;
      offset += width;
    }
    return slot - offset;
  }
  backref(slot, r) {
    if (this.burns.length > 0 && slot >= this.burns[0][0]) {
      const walker = this.translateRef(slot);
      if (walker === null) {
        return [slot, "reserved", null];
      }
      slot = walker;
    }
    const ent = this.slots.get(slot);
    if (ent === void 0) {
      if (slot < this.walkBase) {
        return [slot, "premodel", null];
      }
      throw new LegacyParseError(`back-ref to unwalked slot ${slot} ${r.ctx()}`);
    }
    if (ent[0] === "class") {
      throw new LegacyParseError(`back-ref to class slot ${slot} ${r.ctx()}`);
    }
    return [slot, ent[1], ent[2]];
  }
};
function preamble(ar, r) {
  const [, , attrs] = ar.readObject(r, "CAttributeContainer");
  let pid = 0;
  if (ar.hasPid) {
    const mask = r.u8();
    for (let bit = 0; bit < 8; bit++) {
      if (mask & 1 << bit) {
        pid |= r.u8() << 8 * bit;
      }
    }
  }
  return { attrs, pid };
}
function drawbase(ar, r) {
  const b = r.raw(8);
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const layCls = ar.classSlot.get("CLayer");
  const tag = r.peekU16();
  let layer;
  if (layCls !== void 0 && tag === (32768 | layCls)) {
    ar.readObject(r, "CLayer");
    layer = 0;
  } else if (tag === 32767) {
    r.u16();
    const big = r.u32();
    if (big & 2147483648) {
      throw new LegacyParseError(`drawbase layer: unexpected class ${r.ctx()}`);
    }
    layer = 0;
  } else {
    layer = r.u16();
  }
  return {
    mat: view.getUint16(0, true),
    hidden: b[2],
    soft: b[5],
    smooth: b[6],
    layer
  };
}
function readVertex(ar, r) {
  preamble(ar, r);
  return { k: "vertex", xyz: r.f64s(3) };
}
function readEdge(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const [s1] = ar.readObject(r, "CVertex");
  const [s2] = ar.readObject(r, "CVertex");
  const [cs, cn] = ar.readObject(r);
  if (cn !== null && cn !== "CCurve" && cn !== "CArcCurve") {
    throw new LegacyParseError(`edge curve pointer resolved to ${cn} ${r.ctx()}`);
  }
  return { k: "edge", db, curve: cs, v1: s1, v2: s2 };
}
function readCurve(ar, r) {
  preamble(ar, r);
  r.u8();
  const n = r.u32();
  return { k: "curve", n };
}
function readArcCurve(ar, r) {
  preamble(ar, r);
  r.raw(5);
  r.f64s(14);
  return { k: "arccurve" };
}
function registerBurn(ar, delta) {
  ar.burns.push([ar.annotWatermark + ar.cumDelta, delta]);
  ar.cumDelta += delta;
  ar.annotWatermark = null;
  if (ar.burnStack.length > 0) {
    ar.burnStack[ar.burnStack.length - 1] += 1;
  }
}
function readEdgeUse(ar, r) {
  preamble(ar, r);
  const [es] = ar.readObject(r, "CEdge");
  const sense = r.u8();
  const p0 = r.pos;
  const tag = r.u16();
  let ps;
  if (tag === 32767) {
    const big = r.u32();
    if (big & 2147483648) {
      throw new LegacyParseError(`edge-use parent is a new object ${r.ctx()}`);
    }
    ps = big;
  } else if (tag === 65535 || tag & 32768) {
    throw new LegacyParseError(`edge-use parent is a new object ${r.ctx()}`);
  } else {
    ps = tag !== 0 ? tag : null;
  }
  const expected = ar.currentLoop !== null ? ar.currentLoop + ar.cumDelta : null;
  if (ps !== expected) {
    const delta = typeof ps === "number" && expected !== null ? ps - expected : 0;
    if (delta > 0 && delta <= 4096 && ar.annotWatermark !== null) {
      registerBurn(ar, delta);
    } else {
      r.pos = p0;
      throw new LegacyParseError(`edge-use parent slot ${ps} != current loop ${expected} ${r.ctx()}`);
    }
  }
  return { k: "edgeuse", edge: es, sense };
}
function readLoop(ar, r) {
  const mySlot = ar.nextSlot - 1;
  const prev = ar.currentLoop;
  ar.currentLoop = mySlot;
  preamble(ar, r);
  r.raw(2);
  const uses = [];
  while (true) {
    if (r.peekU16() === 0) {
      r.pos += 2;
      break;
    }
    const [, , v] = ar.readObject(r, "CEdgeUse");
    uses.push(v);
  }
  ar.currentLoop = prev;
  return { k: "loop", uses };
}
function readFace(ar, r) {
  const pre = preamble(ar, r);
  const db = drawbase(ar, r);
  const plane = r.f64s(4);
  const nloops = r.u32();
  if (nloops > 1e4) {
    throw new LegacyParseError(`implausible loop count ${nloops} ${r.ctx()}`);
  }
  const loops = [];
  for (let i2 = 0; i2 < nloops; i2++) {
    const [, , v] = ar.readObject(r, "CLoop");
    loops.push(v);
  }
  const backMat = r.u16();
  return { k: "face", db, plane, loops, back_mat: backMat, attrs: pre.attrs };
}
function readAttrContainer(ar, r) {
  preamble(ar, r);
  const children = [];
  while (true) {
    if (r.peekU16() === 0) {
      r.pos += 2;
      break;
    }
    const [, n, v] = ar.readObject(r, "CAttributeNamed");
    children.push([n, v]);
  }
  return { k: "attrs", children };
}
function readAttrNamed(ar, r) {
  preamble(ar, r);
  r.raw(4);
  const dictname = r.utf16();
  function readTyped(t) {
    if (t === 0) return null;
    if (t === 4) return r.i32();
    if (t === 6) return r.f64();
    if (t === 7) return r.u8();
    if (t === 9) return r.u32();
    if (t === 10) return r.utf16();
    if (t === 12) return r.f64();
    if (t === 11) {
      const n = r.u32();
      if (n > 1e5) {
        throw new LegacyParseError(`implausible attr array count ${r.ctx()}`);
      }
      const arr = [];
      for (let i2 = 0; i2 < n; i2++) arr.push(readTyped(r.u8()));
      return arr;
    }
    if (t === 17) return r.f64s(3);
    if (t === 18) return r.f64s(3);
    throw new LegacyParseError(`unknown attribute value type 0x${t.toString(16)} ${r.ctx()}`);
  }
  const entries = {};
  while (true) {
    const key = r.utf16();
    if (key === "") break;
    entries[key] = readTyped(r.u8());
  }
  r.u32();
  return { k: "dict", name: dictname, entries };
}
var DYNAMIC_ATTRIBUTES_DICT_NAME = "dynamic_attributes";
function stringifyAttrValue(value) {
  if (value === null || value === void 0) return "";
  if (Array.isArray(value)) return value.map(stringifyAttrValue).join(",");
  return String(value);
}
function extractLegacyDynamicProperties(attrs) {
  if (!attrs || typeof attrs !== "object") return {};
  for (const [, value] of attrs.children || []) {
    if (value && typeof value === "object" && value.name === DYNAMIC_ATTRIBUTES_DICT_NAME) {
      const entries = value.entries || {};
      const properties = {};
      for (const key of Object.keys(entries)) {
        properties[key] = stringifyAttrValue(entries[key]);
      }
      return properties;
    }
  }
  return {};
}
function readLayer(ar, r) {
  preamble(ar, r);
  const name = r.utf16();
  const mid = [];
  while (mid.length < 8 && !bytesEqual(r.peek(3), STR_MARKER)) {
    mid.push(r.raw(1)[0]);
  }
  r.utf16();
  const flags = r.u16();
  if (flags & 255) {
    const tex = textureBlock(ar, r);
    r.raw(4);
    return { k: "layer", name, hidden: mid.length ? mid[0] : 0, rgba: tex.rgba };
  }
  const rgba = r.raw(4);
  r.utf16();
  r.raw(21);
  return { k: "layer", name, hidden: mid.length ? mid[0] : 0, rgba: Array.from(rgba) };
}
function textureBlock(ar, r) {
  r.raw(ar.ver >= 17 ? 2 : 1);
  const [s, , dib] = ar.readObject(r, "CDib");
  if (!(dib && typeof dib === "object" && dib.k === "dib")) {
    throw new LegacyParseError(`texture object is not a dib ${r.ctx()}`);
  }
  const marker = findBytes(r.data, STR_MARKER, r.pos, r.pos + 28);
  if (marker - r.pos === 20) {
    r.u32();
  } else if (marker - r.pos !== 16) {
    throw new LegacyParseError(`texture size block misaligned ${r.ctx()}`);
  }
  const w = r.f64();
  const h = r.f64();
  const fname = r.utf16();
  const avg = r.raw(9);
  r.utf16();
  const blob = r.raw(8);
  const opacity = r.f64();
  const useOp = r.u8();
  const colorized = Boolean(blob[4]) || avg[3] === 255;
  return {
    rgba: Array.from(avg.subarray(0, 4)),
    opacity,
    use_opacity: useOp,
    tex_dib: s,
    tex_w: w,
    tex_h: h,
    tex_file: fname,
    colorized
  };
}
function readMaterial(ar, r) {
  preamble(ar, r);
  const name = r.utf16();
  const texflag = r.u16();
  const out = { k: "material", name };
  if (texflag === 0) {
    const rgba = r.raw(4);
    r.utf16();
    r.raw(8);
    const opacity = r.f64();
    const useOp = r.u8();
    out.rgba = Array.from(rgba);
    out.opacity = opacity;
    out.use_opacity = useOp;
  } else {
    const tex = textureBlock(ar, r);
    out.rgba = tex.rgba;
    out.opacity = tex.opacity;
    out.use_opacity = tex.use_opacity;
    out.tex_dib = tex.tex_dib;
    out.tex_w = tex.tex_w;
    out.tex_h = tex.tex_h;
    out.tex_file = tex.tex_file;
    out.colorized = tex.colorized;
  }
  return out;
}
function readDib(ar, r) {
  const subtype = r.u32();
  const length = r.u32();
  if (length > r.data.length) {
    throw new LegacyParseError(`implausible dib length ${length} ${r.ctx()}`);
  }
  const data = r.raw(length);
  return { k: "dib", subtype, data };
}
function readFtc(ar, r) {
  preamble(ar, r);
  r.u32();
  const ks = r.f64s(24);
  const frontPinsCount = r.u32();
  const frontPins = [];
  for (let i2 = 0; i2 < frontPinsCount; i2++) frontPins.push(r.f64s(4));
  const backPinsCount = r.u32();
  const backPins = [];
  for (let i2 = 0; i2 < backPinsCount; i2++) backPins.push(r.f64s(4));
  const fflags = r.u32();
  const bflags = r.u32();
  return {
    k: "ftc",
    front: ks.slice(0, 9),
    back: ks.slice(12, 21),
    front_pins: frontPins,
    back_pins: backPins,
    front_projected: Boolean(fflags & 2),
    back_projected: Boolean(bflags & 2)
  };
}
function readCamera(ar, r) {
  r.raw(137);
  r.u16();
  r.utf16();
  r.raw(33);
  return { k: "camera" };
}
function readThumbnail(ar, r) {
  preamble(ar, r);
  ar.readObject(r, "CCamera");
  const [, , dib] = ar.readObject(r, "CDib");
  return { k: "thumbnail", dib };
}
function readImage(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const [ds] = ar.readObject(r);
  const xform = r.f64s(12);
  r.f64();
  r.utf16();
  const guid = r.raw(16);
  return { k: "image", db, def: ds, xform, guid: toHex(guid) };
}
function entityRef(ar, r) {
  const tag = r.u16();
  if (tag === 0) return null;
  if (tag === 32767) {
    const big = r.u32();
    if (big & 2147483648) {
      throw new LegacyParseError(`entity ref is a new object ${r.ctx()}`);
    }
    return big;
  }
  if (tag === 65535 || tag & 32768) {
    throw new LegacyParseError(`entity ref is a new object ${r.ctx()}`);
  }
  return tag;
}
function readRelationship(ar, r) {
  preamble(ar, r);
  const a = entityRef(ar, r);
  const b = entityRef(ar, r);
  return { k: "relationship", refs: [a, b] };
}
function strictNextTag(ar, data, at, allowNull = true) {
  if (at + 2 > data.length) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const t = view.getUint16(at, true);
  if (t === 0) return allowNull;
  if (t === 32767 || t === 65535) return true;
  if (t & 32768) {
    const ent = ar.slots.get(t & 32767);
    return ent !== void 0 && ent[0] === "class";
  }
  return false;
}
function readConstructionLine(ar, r) {
  preamble(ar, r);
  drawbase(ar, r);
  const point = r.f64s(3);
  const direction = r.f64s(3);
  const [startParam, endParam] = r.f64s(2);
  let k = ar.clineTail;
  if (k === null) {
    const dflt2 = ar.ver === 17 ? 7 : 4;
    const order = [dflt2, ...[0, 4, 7].filter((c) => c !== dflt2)];
    outer: for (const allowNull of [false, true]) {
      for (const cand of order) {
        if (strictNextTag(ar, r.data, r.pos + cand, allowNull)) {
          k = cand;
          break outer;
        }
      }
    }
    if (k === null) k = dflt2;
    ar.clineTail = k;
  }
  r.raw(k);
  const huge = 1e20;
  const start = Math.abs(startParam) >= huge ? null : [point[0] + direction[0] * startParam, point[1] + direction[1] * startParam, point[2] + direction[2] * startParam];
  const end = Math.abs(endParam) >= huge ? null : [point[0] + direction[0] * endParam, point[1] + direction[1] * endParam, point[2] + direction[2] * endParam];
  return { k: "cline", point: [point[0], point[1], point[2]], direction: [direction[0], direction[1], direction[2]], start, end };
}
function readConstructionPoint(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const pos = r.f64s(3);
  r.f64s(3);
  r.u8();
  return { k: "cpoint", db, pos };
}
function readSectionPlane(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const view = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  const first = view.getFloat64(r.pos, true);
  if (!(Math.abs(first) <= 1.0001)) {
    ar.readObject(r);
  }
  const plane = r.f64s(4);
  let name = "";
  let label = "";
  if (bytesEqual(r.peek(3), STR_MARKER)) {
    name = r.utf16();
    label = r.utf16();
  }
  return { k: "sectionplane", plane, name, label, db };
}
function readSkFont(ar, r) {
  ar.readObject(r, "CAttributeContainer");
  if (ar.hasPid) {
    r.u8();
  }
  r.utf16();
  r.raw(15);
  return { k: "font" };
}
function readDimLinear(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const text = r.utf16();
  ar.readObject(r, "CSkFont");
  r.raw(37);
  const c1 = entityRef(ar, r);
  r.raw(42);
  const c2 = entityRef(ar, r);
  r.raw(82);
  return { k: "dimension", db, text, connect: [c1, c2] };
}
function readText(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  ar.readObject(r, "CSkFont");
  let p = r.pos;
  let idx;
  while (true) {
    idx = findBytes(r.data, STR_MARKER, p, r.pos + 512);
    if (idx < 0) {
      throw new LegacyParseError(`text delimiter not found ${r.ctx()}`);
    }
    const blk = r.data.subarray(idx - 11, idx);
    if (blk[0] === 1 && blk[1] === 0 && blk[2] === 0 && blk[3] === 0 && blk[6] === 3 && blk[7] === 0 && blk[8] === 0 && blk[9] === 0 && blk[10] === 1) {
      break;
    }
    p = idx + 3;
  }
  r.raw(idx - r.pos);
  const text = r.utf16();
  r.raw(5);
  const attach = [];
  while (true) {
    const head = r.peek(2);
    if (!(head.length === 2 && head[0] === 255 && head[1] === 127)) break;
    const full = r.peek(6);
    if (full.length < 6) break;
    const dv = new DataView(full.buffer, full.byteOffset, full.byteLength);
    const val = dv.getUint32(2, true);
    if (val & 2147483648) break;
    r.raw(6);
    attach.push(val);
  }
  return { k: "text", text, db, attach };
}
function readEntityList(ar, r, count, owner) {
  const ents = [];
  ar.burnStack.push(0);
  try {
    return readEntityListInner(ar, r, count, owner, ents);
  } finally {
    ar.burnStack.pop();
  }
}
function readEntityListInner(ar, r, count, owner, ents) {
  const view = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  while (ents.length < count) {
    const p = r.pos;
    const hasBurnCredit = owner === "def" && ar.burnStack.length > 0 && ar.burnStack[ar.burnStack.length - 1] > 0;
    if (hasBurnCredit && p + 25 <= r.data.length && view.getUint32(p, true) === 0 && bytesEqual(r.data.subarray(p + 22, p + 25), STR_MARKER)) {
      break;
    }
    const prevFlag = ar.inEntityList;
    ar.inEntityList = true;
    try {
      const [s, n, v] = ar.readObject(r);
      ar.inEntityList = prevFlag;
      ents.push([s, n, v]);
    } catch (e) {
      ar.inEntityList = prevFlag;
      if (!(e instanceof LegacyParseError)) {
        throw e;
      }
      if (owner === "root") {
        r.pos = p;
        break;
      }
      if (hasBurnCredit) {
        r.pos = p;
        break;
      }
      throw e;
    }
  }
  return ents;
}
function readDefinition(ar, r) {
  preamble(ar, r);
  r.raw(ar.ver >= 17 ? 22 : 20);
  const nlayers = r.u32();
  if (nlayers > 1e4) {
    throw new LegacyParseError(`implausible def layer count ${r.ctx()}`);
  }
  let got = 0;
  while (got < nlayers) {
    if (r.peekU16() === 0) {
      r.pos += 2;
      continue;
    }
    ar.readObject(r, "CLayer");
    got += 1;
  }
  const decl = r.u16();
  if (decl === 32767) {
    r.u32();
  }
  let count = null;
  if (ar.ver >= 20) {
    count = retryCountAfterV20Filler(r, r.pos, 5e6, ar);
  }
  if (count === null) {
    r.u32();
    count = r.u32();
  }
  if (count > 5e6 || count === 0) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 5e6, ar);
    if (retry !== null) count = retry;
  }
  if (count > 5e6) {
    throw new LegacyParseError(`implausible def entity count ${r.ctx()}`);
  }
  const ents = readEntityList(ar, r, count, "def");
  let nrel = r.u32();
  if (nrel > 1e5) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 1e5, ar);
    if (retry !== null) nrel = retry;
  }
  if (nrel > 1e5) {
    throw new LegacyParseError(`definition list misaligned ${r.ctx()}`);
  }
  for (let i2 = 0; i2 < nrel; i2++) {
    ar.readObject(r, "CRelationship");
  }
  r.u16();
  if (!bytesEqual(r.peek(19).subarray(16, 19), STR_MARKER)) {
    for (let skip = 1; skip <= 4; skip++) {
      const at = r.pos + skip;
      if (bytesEqual(r.data.subarray(at + 16, at + 19), STR_MARKER)) {
        r.pos = at;
        break;
      }
    }
  }
  const guid = r.raw(16);
  const name = r.utf16();
  r.utf16();
  r.utf16();
  r.u32();
  let tpos = null;
  const thumbSlot = ar.classSlot.get("CThumbnail");
  for (let off = 0; off < 96; off++) {
    const p = r.pos + off;
    if (r.data[p] === 255 && r.data[p + 1] === 255 && r.data[p + 4] === 10 && r.data[p + 5] === 0 && matchesAscii(r.data, p + 6, "CThumbnail")) {
      tpos = p;
      break;
    }
    if (thumbSlot !== void 0 && isClassRef(r.data, p, thumbSlot)) {
      tpos = p;
      break;
    }
  }
  if (tpos === null) {
    throw new LegacyParseError(`definition tail: thumbnail not found ${r.ctx()}`);
  }
  const gap = r.raw(tpos - r.pos);
  const behavior = gap.length >= 9 ? gap[gap.length - 9] : 0;
  ar.readObject(r, "CThumbnail");
  return {
    k: "definition",
    name,
    guid: toHex(guid),
    ents,
    faces_camera: Boolean(behavior & 1),
    shadows_face_sun: Boolean(behavior & 2)
  };
}
function readInstance(ar, r) {
  const cls = ar.currentClass;
  const pre = preamble(ar, r);
  const db = drawbase(ar, r);
  const [ds, dn] = ar.readObject(r, "CComponentDefinition");
  if (dn !== "CComponentDefinition") {
    throw new LegacyParseError(`instance definition ref is ${dn} ${r.ctx()}`);
  }
  const xf = r.f64s(13);
  const name = r.utf16();
  const minSchema = cls === "CGroup" ? 1 : 5;
  const schema = cls !== null ? ar.classSchema.get(cls) : void 0;
  const guid = schema === void 0 || schema >= minSchema ? r.raw(16) : new Uint8Array(0);
  return { k: "instance", db, def: ds, xf, name, guid: toHex(guid), attrs: pre.attrs };
}
var READERS = {
  CVertex: readVertex,
  CEdge: readEdge,
  CCurve: readCurve,
  CArcCurve: readArcCurve,
  CEdgeUse: readEdgeUse,
  CLoop: readLoop,
  CFace: readFace,
  CLayer: readLayer,
  CMaterial: readMaterial,
  CDib: readDib,
  CAttributeContainer: readAttrContainer,
  CAttributeNamed: readAttrNamed,
  CCamera: readCamera,
  CThumbnail: readThumbnail,
  CRelationship: readRelationship,
  CComponentDefinition: readDefinition,
  CImage: readImage,
  CComponentInstance: readInstance,
  CGroup: readInstance,
  CFaceTextureCoords: readFtc,
  CConstructionLine: readConstructionLine,
  CConstructionPoint: readConstructionPoint,
  CSectionPlane: readSectionPlane,
  CSkFont: readSkFont,
  CDimensionLinear: readDimLinear,
  CText: readText
};
function isLegacy(data) {
  if (!(data.length >= 4 && data[0] === 255 && data[1] === 254 && data[2] === 255 && data[3] === 14)) {
    return false;
  }
  const head100 = data.subarray(0, Math.min(256, data.length));
  if (findBytes(head100, new Uint8Array([80, 75, 3, 4])) >= 0) {
    return false;
  }
  const head200 = data.subarray(0, Math.min(512, data.length));
  return findBytes(head200, new Uint8Array(asciiBytes("CVersionMap"))) >= 0;
}
var CMATERIAL_PATTERN = [
  255,
  255,
  null,
  null,
  9,
  0,
  ...asciiBytes("CMaterial")
];
var CLAYER_PATTERN = [
  255,
  255,
  null,
  null,
  6,
  0,
  ...asciiBytes("CLayer")
];
function findVersionMajor(data) {
  const head = data.subarray(0, Math.min(96, data.length));
  const stripped = [];
  for (let i2 = 0; i2 < head.length; i2++) {
    if (head[i2] !== 0) stripped.push(head[i2]);
  }
  const text = new TextDecoder("latin1").decode(new Uint8Array(stripped));
  const m = text.match(/\{(\d+)\./);
  if (!m) return null;
  return parseInt(m[1], 10);
}
function bootstrapTwoMaterials(data, ver, matHdr) {
  const boot = new Archive(data, ver);
  Object.assign(boot.readers, READERS);
  boot.nextSlot = 1 << 20;
  boot.walkBase = 1 << 20;
  boot.r.pos = matHdr;
  boot.readObject(boot.r, "CMaterial");
  const tag = boot.r.peekU16();
  if (tag === 65535 || !(tag & 32768)) {
    throw new LegacyParseError("cannot bootstrap the slot base");
  }
  return tag & 32767;
}
function probeLayerAnchorBases(data, ver, start, matCount) {
  const boot = new Archive(data, ver);
  Object.assign(boot.readers, READERS);
  const b0 = 1 << 20;
  boot.nextSlot = b0;
  boot.walkBase = b0;
  boot.r.pos = start;
  for (let i2 = 0; i2 < matCount; i2++) {
    boot.readObject(boot.r, "CMaterial");
  }
  boot.r.u32();
  if (ver >= 17) {
    boot.r.u8();
  }
  const layerCount = boot.r.u32();
  if (!(layerCount >= 1 && layerCount <= 1e5)) {
    throw new LegacyParseError("implausible layer count in base probe");
  }
  const layerSlots = [];
  for (let i2 = 0; i2 < layerCount; i2++) {
    const [s2] = boot.readObject(boot.r, "CLayer");
    layerSlots.push(s2);
  }
  const [s, n] = boot.readObject(boot.r);
  if (n !== "premodel") {
    throw new LegacyParseError(`base probe: anchor resolved to ${n}`);
  }
  return layerSlots.map((rel) => s - (rel - b0)).filter((cand) => cand > 0 && cand < b0);
}
function walk(data) {
  const ver = findVersionMajor(data);
  if (ver === null) {
    throw new LegacyParseError("no version string in header");
  }
  const headerView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const matHdr = findPattern(data, CMATERIAL_PATTERN);
  let start;
  let matCount;
  if (matHdr >= 0) {
    start = matHdr;
    matCount = headerView.getUint32(matHdr - 4, true);
    if (matCount > 1e5) {
      throw new LegacyParseError("implausible material count");
    }
  } else {
    const layerHdr = findPattern(data, CLAYER_PATTERN);
    if (layerHdr < 0) {
      throw new LegacyParseError("no CMaterial or CLayer class record found");
    }
    matCount = 0;
    start = layerHdr - (ver >= 17 ? 9 : 8);
  }
  const bases = matCount >= 2 ? [bootstrapTwoMaterials(data, ver, start)] : probeLayerAnchorBases(data, ver, start, matCount);
  let lastExc = null;
  for (const base of bases) {
    try {
      return walkModel(data, ver, start, matCount, base);
    } catch (exc) {
      if (!(exc instanceof LegacyParseError)) throw exc;
      lastExc = exc;
    }
  }
  if (lastExc !== null) throw lastExc;
  throw new LegacyParseError("no viable slot base candidate");
}
function walkModel(data, ver, start, matCount, base) {
  const ar = new Archive(data, ver);
  Object.assign(ar.readers, READERS);
  ar.nextSlot = base;
  ar.walkBase = base;
  const r = ar.r;
  r.pos = start;
  const materials = [];
  for (let i2 = 0; i2 < matCount; i2++) {
    const [s, , v] = ar.readObject(r, "CMaterial");
    materials.push([s, v]);
  }
  r.u32();
  if (ver >= 17) {
    r.u8();
  }
  const layerCount = r.u32();
  if (layerCount > 1e5) {
    throw new LegacyParseError("implausible layer count");
  }
  const layers = [];
  while (layers.length < layerCount) {
    const tag = r.peekU16();
    if (tag === 0) {
      r.pos += 2;
      continue;
    }
    if (tag !== 65535 && !(tag & 32768)) {
      break;
    }
    const [s, , v] = ar.readObject(r, "CLayer");
    if (v === null) continue;
    layers.push([s, v]);
  }
  const layCls = ar.classSlot.get("CLayer");
  while (true) {
    const tag = r.peekU16();
    if (tag === 0) {
      r.pos += 2;
      continue;
    }
    if (layCls !== void 0 && tag === (32768 | layCls)) {
      const [s, , v] = ar.readObject(r, "CLayer");
      if (v !== null) layers.push([s, v]);
      continue;
    }
    break;
  }
  const [, dn] = ar.readObject(r);
  if (dn !== "CLayer") {
    throw new LegacyParseError(`definition-list anchor is ${dn}, not a layer`);
  }
  let defCount = r.u32();
  if (defCount > 1e6) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 1e6, ar);
    if (retry !== null) defCount = retry;
  }
  if (defCount > 1e6) {
    throw new LegacyParseError("implausible definition count");
  }
  for (let i2 = 0; i2 < defCount; i2++) {
    ar.readObject(r, "CComponentDefinition");
  }
  const defCls = ar.classSlot.get("CComponentDefinition");
  while (true) {
    const tag = r.peekU16();
    let isDef = defCls !== void 0 && tag === (32768 | defCls);
    if (!isDef && tag === 65535 && matchesAscii(r.peek(26), 6, "CComponentDefinition")) {
      isDef = true;
    }
    if (!isDef) break;
    ar.readObject(r);
  }
  let rootCount = r.u32();
  if (rootCount > 5e6) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 5e6, ar);
    if (retry !== null) rootCount = retry;
  }
  if (rootCount > 5e6) {
    throw new LegacyParseError("implausible root entity count");
  }
  const root = readEntityList(ar, r, rootCount, "root");
  return { ar, root, layers, materials };
}
var LegacyBuilder = class {
  constructor() {
    this.vertices = new DefaultVertexStore();
    this.edges = /* @__PURE__ */ new Map();
    this.edgeFlags = new EdgeFlagStore();
    this.faces = /* @__PURE__ */ new Map();
    this.instances = [];
    this.sectionPlanes = [];
    this.texts = [];
    this.dimensions = [];
    this.constructionLines = [];
    this.constructionPoints = [];
  }
};
function addEdge(builder, slot, e, slots) {
  if (builder.edges.has(slot)) return;
  const v1 = e.v1;
  const v2 = e.v2;
  for (const vs of [v1, v2]) {
    if (vs === null || vs === void 0) continue;
    const ent = slots.get(vs);
    if (ent !== void 0 && ent[2] !== null && !builder.vertices.has(vs)) {
      const xyz = ent[2].xyz;
      builder.vertices.set(vs, [xyz[0], xyz[1], xyz[2]]);
    }
  }
  builder.edges.set(slot, [v1, v2]);
  const db = e.db || {};
  const flags = (db.soft ? 8 : 0) | (db.smooth ? 16 : 0) | (db.hidden ? 1 : 0);
  if (flags) {
    builder.edgeFlags.set(slot, flags);
  }
}
function fillBuilder(builder, ents, slots) {
  for (const [s, , v] of ents) {
    if (v === null || typeof v !== "object") continue;
    const k = v.k;
    if (k === "edge") {
      addEdge(builder, s, v, slots);
    } else if (k === "face") {
      const loops = [];
      for (const lp of v.loops) {
        const loop = [];
        for (const u of lp.uses) {
          const es = u.edge;
          const ent = slots.get(es);
          if (ent === void 0 || ent[2] === null) continue;
          addEdge(builder, es, ent[2], slots);
          loop.push({ edgeId: es, orientation: u.sense ? -1 : 1 });
        }
        loops.push(loop);
      }
      const face = {
        loops,
        normal: [v.plane[0], v.plane[1], v.plane[2]],
        materialId: v.db.mat || null,
        backMaterialId: v.back_mat || null,
        uvTransform: null,
        uvTransformBack: null,
        uvProjected: false,
        uvProjectedBack: false,
        hidden: Boolean(v.db.hidden)
      };
      const attrs = v.attrs;
      if (attrs && typeof attrs === "object") {
        for (const [, cv] of attrs.children || []) {
          if (cv && typeof cv === "object" && cv.k === "ftc") {
            face.uvTransform = [...cv.front];
            face.uvTransformBack = [...cv.back];
            face.uvProjected = cv.front_projected;
            face.uvProjectedBack = cv.back_projected;
          }
        }
      }
      builder.faces.set(s, face);
    } else if (k === "instance") {
      builder.instances.push({
        offset: 0,
        name: v.name,
        refIdx: v.def,
        refGuid: "",
        matrix: [...v.xf],
        materialId: v.db.mat || null,
        layerId: v.db.layer || null,
        hidden: Boolean(v.db.hidden),
        children: [],
        properties: extractLegacyDynamicProperties(v.attrs)
      });
    } else if (k === "image") {
      builder.instances.push({
        offset: 0,
        name: "",
        refIdx: v.def,
        refGuid: v.guid || "",
        matrix: [...v.xform],
        materialId: v.db.mat || null,
        layerId: v.db.layer || null,
        hidden: Boolean(v.db.hidden),
        children: [],
        properties: {}
      });
    } else if (k === "sectionplane") {
      builder.sectionPlanes.push({
        plane: v.plane || [0, 0, 1, 0],
        name: v.name || "",
        label: v.label || "",
        hidden: Boolean(v.db && v.db.hidden)
      });
    } else if (k === "text") {
      builder.texts.push({
        text: v.text || "",
        hidden: Boolean(v.db && v.db.hidden)
      });
    } else if (k === "dimension") {
      builder.dimensions.push({
        text: v.text || "",
        hidden: Boolean(v.db && v.db.hidden)
      });
    } else if (k === "cline") {
      builder.constructionLines.push({
        point: v.point,
        direction: v.direction,
        start: v.start,
        end: v.end
      });
    } else if (k === "cpoint") {
      builder.constructionPoints.push({
        position: [v.pos[0], v.pos[1], v.pos[2]]
      });
    }
  }
}
function parseLegacyToRaw(data, options) {
  const t0 = Date.now();
  emitLog(options, "info", `Parsing legacy buffer (${data.length} bytes)`);
  let version = "unknown";
  const second = findBytes(data, STR_MARKER, 4);
  if (second > 0) {
    const textBytes = data.subarray(second + 4, Math.min(second + 100, data.length));
    const text = new TextDecoder("utf-16le", { fatal: false }).decode(textBytes);
    const braceStart = text.indexOf("{");
    const braceEnd = text.indexOf("}");
    if (braceStart >= 0 && braceEnd >= 0) {
      version = text.slice(braceStart, braceEnd + 1);
    }
  }
  emitLog(options, "debug", `Detected legacy version ${version}`);
  let walkResult;
  try {
    walkResult = walk(data);
  } catch (e) {
    if (e instanceof LegacyParseError || e instanceof RangeError) {
      throw new SkpParseError(`legacy .skp parse failed: ${e.message}`, {
        stage: "legacy_walk",
        cause: e
      });
    }
    throw e;
  }
  const { ar, root, layers, materials } = walkResult;
  const slots = ar.slots;
  emitLog(options, "debug", `Legacy walk complete: ${materials.length} materials, ${layers.length} layers`);
  const imageDefIds = /* @__PURE__ */ new Set();
  for (const ent of slots.values()) {
    if (ent[0] === "obj" && ent[1] === "CImage" && ent[2]) {
      imageDefIds.add(ent[2].def);
    }
  }
  const materialsMap = /* @__PURE__ */ new Map();
  const materialIdToName = /* @__PURE__ */ new Map();
  for (const [s, v] of materials) {
    const rgba = v.rgba || [128, 128, 128, 255];
    let trans;
    if (v.use_opacity) {
      trans = Math.min(Math.max(1 - v.opacity, 0), 1);
    } else {
      trans = 1;
    }
    const colorized = v.colorized || false;
    let texture = null;
    if ("tex_dib" in v) {
      const dib = slots.get(v.tex_dib);
      const texData = dib && dib[2] ? dib[2].data : null;
      const isPng = texData && texData.length >= 4 && texData[0] === 137 && texData[1] === 80 && texData[2] === 78 && texData[3] === 71;
      const ext = isPng ? ".png" : ".jpg";
      const fname = v.tex_file || `${v.name}${ext}`;
      texture = { filename: fname, width: v.tex_w, height: v.tex_h, data: texData };
    }
    const matObj = {
      name: v.name,
      color: { r: rgba[0], g: rgba[1], b: rgba[2], a: rgba[3] },
      transparency: trans,
      id: null,
      texture,
      // colourize type is not decoded in the legacy record; tint (1) is
      // the correct rendering for the grey base textures observed.
      colorized,
      colorizeType: colorized ? 1 : 0
    };
    materialsMap.set(v.name, matObj);
    materialIdToName.set(s, v.name);
  }
  const layerColors = /* @__PURE__ */ new Map();
  const layerHidden = /* @__PURE__ */ new Map();
  const layerIdToName = /* @__PURE__ */ new Map();
  for (const [s, v] of layers) {
    const rgba = v.rgba || [136, 136, 136, 255];
    layerColors.set(v.name, [rgba[0], rgba[1], rgba[2]]);
    layerHidden.set(v.name, Boolean(v.hidden));
    layerIdToName.set(s, v.name);
  }
  if (!layerColors.has("Layer0")) {
    layerColors.set("Layer0", [136, 136, 136]);
  }
  if (!layerHidden.has("Layer0")) {
    layerHidden.set("Layer0", false);
  }
  const defsDict = /* @__PURE__ */ new Map();
  let processed = 0;
  let lastSlot;
  try {
    for (const [s, ent] of slots.entries()) {
      lastSlot = s;
      if (ent[0] === "obj" && ent[1] === "CComponentDefinition" && ent[2]) {
        const d = ent[2];
        const b = new LegacyBuilder();
        fillBuilder(b, d.ents, slots);
        defsDict.set(s, {
          guid: d.guid,
          name: d.name,
          isImage: imageDefIds.has(s),
          alwaysFacesCamera: d.faces_camera || false,
          shadowsFaceSun: d.shadows_face_sun || false,
          builder: b
        });
        processed++;
        if (processed % PROGRESS_INTERVAL === 0) {
          emitProgress(options, "legacy_defs", processed, processed);
          emitLog(options, "debug", `Processed ${processed} component definitions`);
        }
      }
    }
  } catch (e) {
    throw new SkpParseError(`Failed while building component definitions: ${e.message}`, {
      stage: "legacy_defs",
      definitionId: lastSlot,
      cause: e
    });
  }
  const rootBuilder = new LegacyBuilder();
  fillBuilder(rootBuilder, root, slots);
  defsDict.set("ROOT", {
    guid: "ROOT",
    name: "ROOT_MODEL",
    isImage: false,
    alwaysFacesCamera: false,
    shadowsFaceSun: false,
    builder: rootBuilder
  });
  emitLog(
    options,
    "info",
    `Parse complete: ${defsDict.size} defs (${((Date.now() - t0) / 1e3).toFixed(2)}s)`
  );
  return {
    version,
    // Legacy (pre-2021 MFC) files carry no meta/meta.dat container -
    // that's a VFF/ZIP-only construct - so there is no known source for
    // the model's unit-system string here.
    units: null,
    layerColors,
    layerHidden,
    layerIdToName,
    // Classic (pre-2021) files carry no equivalent VFF entity families -
    // the legacy CArchive walker never surfaces scenes or model-level
    // linear dimensions (legacy files still surface text-only dimensions
    // per definition, via each entity list's own CDimensionLinear reads).
    pages: [],
    dimensions: [],
    materialIdToName,
    materialsMap,
    materialsByFolder: /* @__PURE__ */ new Map(),
    styles: [],
    defsDict
  };
}
function tlvItemsInt(buf) {
  if (buf === null) return null;
  const items = [];
  let off = 0;
  const n = buf.length;
  while (off < n) {
    if (off + 6 > n) return null;
    const tag = buf[off] | buf[off + 1] << 8;
    const ln2 = readU32(buf, off + 2);
    if (tag === 0 || off + 6 + ln2 > n) return null;
    items.push({ tag, payload: buf.subarray(off + 6, off + 6 + ln2) });
    off += 6 + ln2;
  }
  return items;
}
function tlvFindInt(items, tag) {
  if (items === null) return null;
  for (const it of items) {
    if (it.tag === tag) return it.payload;
  }
  return null;
}
function toHex2(data) {
  let s = "";
  for (let i2 = 0; i2 < data.length; i2++) {
    const h = data[i2].toString(16).toUpperCase();
    s += h.length === 1 ? "0" + h : h;
  }
  return s;
}
function stripDe05(p) {
  if (p.length >= 2 && p[0] === 222 && p[1] === 5) {
    const idlen = readU32(p, 2);
    return p.subarray(6, 6 + idlen);
  }
  return p;
}
function findBytes2(data, needle, start = 0) {
  const nlen = needle.length;
  const limit = data.length - nlen;
  outer: for (let i2 = start; i2 <= limit; i2++) {
    for (let j = 0; j < nlen; j++) {
      if (data[i2 + j] !== needle[j]) continue outer;
    }
    return i2;
  }
  return -1;
}
function scanVertexPositions(top, id2pos) {
  function walk2(nodes) {
    for (const el of nodes) {
      if (el.tag === "C409") {
        const dc05 = findChildTag(el.children, "DC05");
        const c509 = findChildTag(el.children, "C509");
        if (dc05 && c509 && c509.payload.length === 24) {
          const idb = stripDe05(dc05.payload);
          id2pos.set(toHex2(idb), [
            readF64(c509.payload, 0),
            readF64(c509.payload, 8),
            readF64(c509.payload, 16)
          ]);
        }
      }
      if (el.children.length > 0) walk2(el.children);
    }
  }
  walk2([top]);
}
function scanInstanceTransforms(top, world) {
  function walk2(nodes, parent) {
    for (const el of nodes) {
      if (el.tag === "6419") {
        const d007 = findChildTag(el.children, "D007");
        const dc05 = d007 ? findChildTag(d007.children, "DC05") : null;
        const iid = dc05 ? toHex2(stripDe05(dc05.payload)) : null;
        const m = findChildTag(el.children, "6619");
        let mat = null;
        if (m && m.payload.length === 104) {
          mat = [];
          for (let i2 = 0; i2 < 13; i2++) mat.push(readF64(m.payload, i2 * 8));
        }
        const here = mat !== null ? multiplyMatrices(parent, mat) : parent;
        if (iid !== null) world.set(iid, here);
        walk2(el.children, here);
      } else if (el.children.length > 0) {
        walk2(el.children, parent);
      }
    }
  }
  walk2([top], null);
}
function parseDimensions(modelData, id2pos, instWorld) {
  const dims = [];
  const needle = new Uint8Array([204, 91]);
  let i2 = 0;
  const n = modelData.length;
  function point(blockPayload) {
    if (blockPayload === null) return null;
    const blk = tlvFindInt(tlvItemsInt(blockPayload), 21e3);
    if (blk === null) return null;
    const sub = tlvItemsInt(blk);
    const typB = tlvFindInt(sub, 21001);
    const typ = typB !== null && typB.length === 4 ? readU32(typB, 0) : null;
    if (typ === 1) {
      const pos = tlvFindInt(sub, 21002);
      if (pos === null || pos.length !== 24) return null;
      return [readF64(pos, 0), readF64(pos, 8), readF64(pos, 16)];
    }
    const refB = tlvFindInt(sub, 21003);
    const f53fc = refB !== null ? tlvFindInt(tlvItemsInt(refB), 21500) : null;
    const fi = f53fc !== null ? tlvItemsInt(f53fc) : null;
    const vid = tlvFindInt(fi, 21501);
    const iid = tlvFindInt(fi, 21502);
    if (vid === null) return null;
    const local = id2pos.get(toHex2(vid));
    if (local === void 0) return null;
    if (iid !== null && iid.length >= 1 && iid[0] > 0 && 1 + iid[0] <= iid.length) {
      const idBytes = iid.subarray(1, 1 + iid[0]);
      const w = instWorld.get(toHex2(idBytes));
      if (w) {
        return transformPoint(w, local);
      }
    }
    return local;
  }
  while (true) {
    const j = findBytes2(modelData, needle, i2);
    if (j < 0) break;
    i2 = j + 1;
    if (j + 6 > n) continue;
    const ln2 = readU32(modelData, j + 2);
    if (ln2 < 40 || j + 6 + ln2 > n) continue;
    const bodyBytes = modelData.subarray(j + 6, j + 6 + ln2);
    const body = tlvItemsInt(bodyBytes);
    if (body === null) continue;
    let has5Bcd = false;
    let has5Bce = false;
    for (const it of body) {
      if (it.tag === 23501) has5Bcd = true;
      if (it.tag === 23502) has5Bce = true;
    }
    if (!has5Bcd || !has5Bce) continue;
    const a = point(tlvFindInt(body, 23501));
    const b = point(tlvFindInt(body, 23502));
    if (a === null || b === null) continue;
    const xaxisB = tlvFindInt(body, 23503);
    const normalB = tlvFindInt(body, 23504);
    const offB = tlvFindInt(body, 23506);
    dims.push({
      a,
      b,
      planeX: xaxisB !== null && xaxisB.length === 24 ? [readF64(xaxisB, 0), readF64(xaxisB, 8), readF64(xaxisB, 16)] : null,
      normal: normalB !== null && normalB.length === 24 ? [readF64(normalB, 0), readF64(normalB, 8), readF64(normalB, 16)] : null,
      offset: offB !== null && offB.length === 8 ? readF64(offB, 0) : 0,
      text: ""
    });
  }
  return dims;
}
function findPageNode(top) {
  return findChildTag([top], "0702");
}
function parsePages(node) {
  const pages = [];
  if (node === null) return pages;
  function vec3(p) {
    return p !== null && p.length === 24 ? [readF64(p, 0), readF64(p, 8), readF64(p, 16)] : null;
  }
  const t60Items = tlvItemsInt(node.payload);
  if (t60Items === null) return pages;
  for (const it60 of t60Items) {
    if (it60.tag !== 28e3) continue;
    const t61Items = tlvItemsInt(it60.payload);
    if (t61Items === null) continue;
    for (const it61 of t61Items) {
      if (it61.tag !== 28001) continue;
      const t48Items = tlvItemsInt(it61.payload);
      if (t48Items === null) continue;
      for (const it48 of t48Items) {
        if (it48.tag !== 29e3) continue;
        const items = tlvItemsInt(it48.payload);
        if (items === null) continue;
        const page = {
          name: "",
          eye: null,
          target: null,
          up: null,
          fov: 35,
          parallel: false,
          orthoHeight: 0,
          hiddenLayerIds: []
        };
        const head = tlvItemsInt(tlvFindInt(items, 28500));
        const name = tlvFindInt(head, 28501);
        if (name !== null && name.length > 0) {
          page.name = new TextDecoder("utf-8").decode(name);
        }
        const camWrap = tlvItemsInt(tlvFindInt(items, 29002));
        const cam = camWrap !== null ? tlvItemsInt(tlvFindInt(camWrap, 13500)) : null;
        if (cam !== null) {
          page.eye = vec3(tlvFindInt(cam, 13501));
          page.target = vec3(tlvFindInt(cam, 13502));
          page.up = vec3(tlvFindInt(cam, 13503));
          const fov = tlvFindInt(cam, 13508);
          if (fov !== null && fov.length === 8) page.fov = readF64(fov, 0);
          const flag = tlvFindInt(cam, 13506);
          page.parallel = flag !== null && flag.length > 0 && flag[0] === 0;
          const height = tlvFindInt(cam, 13507);
          if (height !== null && height.length === 8) page.orthoHeight = readF64(height, 0);
        }
        const hidden = tlvFindInt(items, 29008);
        let off = 0;
        while (hidden !== null && off + 1 <= hidden.length) {
          const ln2 = hidden[off];
          if (ln2 === 0 || off + 1 + ln2 > hidden.length) break;
          page.hiddenLayerIds.push(parseVarInt(hidden, off + 1, ln2));
          off += 1 + ln2;
        }
        if (page.eye !== null && page.target !== null) pages.push(page);
      }
    }
  }
  return pages;
}
var UINT16_INDEX_LIMIT = 65535;
var COMPONENT_TYPE_UNSIGNED_SHORT = 5123;
var COMPONENT_TYPE_UNSIGNED_INT = 5125;
function encodeIndices(indices) {
  let max2 = 0;
  for (let i2 = 0; i2 < indices.length; i2++) {
    if (indices[i2] > max2) max2 = indices[i2];
  }
  if (max2 <= UINT16_INDEX_LIMIT) {
    const narrowed = new Uint16Array(indices.length);
    narrowed.set(indices);
    return {
      componentType: COMPONENT_TYPE_UNSIGNED_SHORT,
      data: narrowed,
      bytesPerIndex: 2
    };
  }
  return {
    componentType: COMPONENT_TYPE_UNSIGNED_INT,
    data: indices,
    bytesPerIndex: 4
  };
}
function buildInstancedSceneFromParsed(parsed, options) {
  const t0 = Date.now();
  const { layerColors, layerIdToName, materialIdToName, materialsMap, materialsByFolder, defsDict, layerHidden } = parsed;
  emitLog(options, "info", `Building instanced scene: ${defsDict.size} definitions available`);
  const instanceCounter = { count: 0 };
  const getLayerColor = (name) => {
    const c = layerColors.get(name) || [136, 136, 136];
    return { r: c[0], g: c[1], b: c[2] };
  };
  const textures = [];
  const textureIndexByKey = /* @__PURE__ */ new Map();
  function textureIndexFor(tex) {
    if (!tex || !tex.data || tex.data.length === 0) return null;
    const mimeType = sniffImageMime(tex.data);
    if (mimeType === null) return null;
    const head = Array.from(tex.data.subarray(0, 16)).join(",");
    const key = `${tex.data.length}:${head}`;
    const hit = textureIndexByKey.get(key);
    if (hit !== void 0) return hit;
    const idx = textures.length;
    textures.push({ data: tex.data, mimeType, filename: tex.filename });
    textureIndexByKey.set(key, idx);
    return idx;
  }
  const colorToMaterialIndex = /* @__PURE__ */ new Map();
  const gltfMaterials = [];
  function getMaterialIndex(color, doubleSided, textureIndex, transparency = 1) {
    const key = `${color.r},${color.g},${color.b},${doubleSided},${textureIndex ?? -1},${transparency}`;
    if (colorToMaterialIndex.has(key)) {
      return colorToMaterialIndex.get(key);
    }
    const idx = gltfMaterials.length;
    const pbr = {
      baseColorFactor: [color.r / 255, color.g / 255, color.b / 255, transparency],
      metallicFactor: 0,
      roughnessFactor: 0.8
    };
    if (textureIndex !== null) {
      pbr.baseColorTexture = { index: textureIndex };
    }
    const material = { pbrMetallicRoughness: pbr };
    if (doubleSided) material.doubleSided = true;
    if (transparency < 1) {
      material.alphaMode = "BLEND";
    } else if (textureIndex !== null) {
      material.alphaMode = "MASK";
    }
    gltfMaterials.push(material);
    colorToMaterialIndex.set(key, idx);
    return idx;
  }
  const meshResources = [];
  const resourceIdByKey = /* @__PURE__ */ new Map();
  function resourceVariantKey(defId, inheritedMaterial, layer) {
    const tex = inheritedMaterial?.texture;
    const texKey = tex && tex.data && tex.data.length > 0 ? `${tex.data.length}:${Array.from(tex.data.subarray(0, 16)).join(",")}:${tex.width}x${tex.height}` : "-";
    const matKey = inheritedMaterial ? `${inheritedMaterial.name}|${inheritedMaterial.color.r},${inheritedMaterial.color.g},${inheritedMaterial.color.b}|${texKey}` : "-";
    const lc2 = getLayerColor(layer);
    return `${String(defId)}|${matKey}|${lc2.r},${lc2.g},${lc2.b}`;
  }
  function meshResourceFor(defId, inheritedMaterial, layer) {
    const d = defsDict.get(defId);
    if (!d || d.builder.faces.size === 0) return void 0;
    const key = resourceVariantKey(defId, inheritedMaterial, layer);
    const hit = resourceIdByKey.get(key);
    if (hit !== void 0) return hit;
    const faceGroups = buildLocalFaceGroups(d.builder, {
      resolveMaterial: (matId) => resolveMaterialFromMaps(matId, materialIdToName, materialsMap, materialsByFolder),
      textureIndexFor,
      inheritedMaterial,
      fallbackLayerColor: getLayerColor(layer),
      definitionId: defId,
      respectVisibility: options?.respectEdgeVisibility
    });
    const primitives = [];
    const scale = 0.0254;
    for (const group of faceGroups.values()) {
      if (group.localFaces.length === 0) continue;
      const positions = new Float32Array(group.localVerts.length * 3);
      const normals = new Float32Array(group.localVerts.length * 3);
      const uvs = new Float32Array(group.localVerts.length * 2);
      for (let i2 = 0; i2 < group.localVerts.length; i2++) {
        const v = group.localVerts[i2];
        positions[i2 * 3] = v[0] * scale;
        positions[i2 * 3 + 1] = v[2] * scale;
        positions[i2 * 3 + 2] = -v[1] * scale;
        uvs[i2 * 2] = group.localUvs[i2][0];
        uvs[i2 * 2 + 1] = group.localUvs[i2][1];
        const rawNorm = group.normalsAccum[i2];
        const normLen = Math.sqrt(rawNorm[0] ** 2 + rawNorm[1] ** 2 + rawNorm[2] ** 2);
        const n = normLen > 1e-6 ? [rawNorm[0] / normLen, rawNorm[1] / normLen, rawNorm[2] / normLen] : [0, 0, 1];
        normals[i2 * 3] = n[0];
        normals[i2 * 3 + 1] = n[2];
        normals[i2 * 3 + 2] = -n[1];
      }
      const indices = new Uint32Array(group.localFaces.length * 3);
      for (let i2 = 0; i2 < group.localFaces.length; i2++) {
        indices[i2 * 3] = group.localFaces[i2][0];
        indices[i2 * 3 + 1] = group.localFaces[i2][1];
        indices[i2 * 3 + 2] = group.localFaces[i2][2];
      }
      primitives.push({
        positions,
        normals,
        uvs,
        indices,
        materialIndex: getMaterialIndex(group.color, group.doubleSided, group.textureIndex, group.transparency)
      });
    }
    if (primitives.length === 0) return void 0;
    const id = `mesh_${meshResources.length}`;
    meshResources.push({
      id,
      definitionId: defId,
      definitionName: d.name || "",
      variantKey: key,
      primitives
    });
    resourceIdByKey.set(key, id);
    return id;
  }
  const activeDefinitions = /* @__PURE__ */ new Set();
  function toGltfMatrix(m) {
    const scale = 0.0254;
    const a = m[0], b = m[1], c = m[2];
    const d = m[3], e = m[4], f = m[5];
    const g = m[6], h = m[7], i2 = m[8];
    const tx = m[9] ?? 0, ty = m[10] ?? 0, tz = m[11] ?? 0;
    const r00 = a, r01 = c, r02 = -b;
    const r10 = g, r11 = i2, r12 = -h;
    const r20 = -d, r21 = -f, r22 = e;
    return [
      r00,
      r10,
      r20,
      0,
      r01,
      r11,
      r21,
      0,
      r02,
      r12,
      r22,
      0,
      tx * scale,
      tz * scale,
      -ty * scale,
      1
    ];
  }
  const IDENTITY_GLTF = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function walk2(defId, currentMatrix, parentLayer, inheritedMaterial) {
    const d = defsDict.get(defId);
    if (!d) return [];
    const nodes = [];
    for (const inst of d.builder.instances) {
      const refIdx = inst.refIdx;
      const newMatrix = multiplyMatrices(currentMatrix, inst.matrix);
      let lName = parentLayer;
      let instMaterial = inheritedMaterial;
      let properties = { ...inst.properties || {} };
      if (inst.layerId !== null && inst.layerId !== void 0) {
        lName = layerIdToName.get(inst.layerId) || parentLayer;
      }
      if (inst.materialId !== null && inst.materialId !== void 0) {
        const matName = materialIdToName.get(inst.materialId);
        if (matName) {
          const mat = materialsMap.get(matName) || materialsByFolder.get(matName);
          if (mat) {
            instMaterial = mat;
          }
        }
      }
      const d007 = inst.children.find((c) => c.tag === "D007");
      let attributeDicts = null;
      if (d007) {
        try {
          properties = extractDynamicProperties(d007, options);
          attributeDicts = extractAttributeDictionaries(d007, options);
        } catch (e) {
          emitLog(
            options,
            "debug",
            `Failed to extract dynamic properties for instance ${inst.name ?? ""} (refIdx=${refIdx}): ${e.message}`
          );
        }
      }
      instanceCounter.count++;
      if (instanceCounter.count % PROGRESS_INTERVAL === 0) {
        emitProgress(options, "build_scene", instanceCounter.count, instanceCounter.count);
        emitLog(options, "debug", `Processed ${instanceCounter.count} placed instances`);
      }
      if (activeDefinitions.has(refIdx)) {
        throw new SkpParseError("Recursive component definition", {
          stage: "build_scene",
          definitionId: refIdx
        });
      }
      activeDefinitions.add(refIdx);
      const children = walk2(refIdx, newMatrix, lName, instMaterial);
      activeDefinitions.delete(refIdx);
      const tx = (newMatrix[9] ?? 0) * 25.4;
      const ty = (newMatrix[10] ?? 0) * 25.4;
      const tz = (newMatrix[11] ?? 0) * 25.4;
      const childDefName = defsDict.get(refIdx)?.name || "";
      const defNameIsReal = !!childDefName && !isGenericDefinitionName(childDefName);
      const nameOverride = findNameOverride(attributeDicts);
      const instNameNonEmpty = !!inst.name;
      const fallbackName = instNameNonEmpty ? inst.name : defNameIsReal ? childDefName : `Component_${refIdx}`;
      const displayName = nameOverride ?? fallbackName;
      const nameIsGenerated = nameOverride === null && !instNameNonEmpty && !defNameIsReal;
      const attributeDictionaries = {};
      if (attributeDicts) {
        for (const dictName of Object.keys(attributeDicts)) {
          if (dictName === "dynamic_attributes" || dictName === "SU_InstanceSet") continue;
          const entries = attributeDicts[dictName];
          const stringified = {};
          for (const key of Object.keys(entries)) stringified[key] = stringifyVffAttrValue(entries[key]);
          attributeDictionaries[dictName] = stringified;
        }
      }
      nodes.push({
        name: displayName,
        nameIsGenerated,
        definitionName: childDefName,
        layer: lName,
        matrix: toGltfMatrix(inst.matrix),
        positionMm: [
          Math.round(tx * 100) / 100,
          Math.round(ty * 100) / 100,
          Math.round(tz * 100) / 100
        ],
        properties,
        attributeDictionaries,
        guid: inst.refGuid || "",
        meshResourceId: meshResourceFor(refIdx, instMaterial, lName),
        children
      });
    }
    return nodes;
  }
  const identityMat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  const rootChildren = walk2("ROOT", identityMat, "Layer0", void 0);
  const rootMeshResourceId = meshResourceFor("ROOT", void 0, "Layer0");
  const sceneHierarchy = {
    name: "ROOT",
    nameIsGenerated: false,
    definitionName: "ROOT_MODEL",
    layer: "Layer0",
    matrix: [...IDENTITY_GLTF],
    positionMm: [0, 0, 0],
    properties: {},
    attributeDictionaries: {},
    guid: "",
    meshResourceId: rootMeshResourceId,
    children: rootChildren
  };
  const bMin = [Infinity, Infinity, Infinity];
  const bMax = [-Infinity, -Infinity, -Infinity];
  const resourceById = new Map(meshResources.map((r) => [r.id, r]));
  const localBoxCache = /* @__PURE__ */ new Map();
  const localBox = (id) => {
    const cached = localBoxCache.get(id);
    if (cached !== void 0) return cached;
    const res = resourceById.get(id);
    let box = null;
    if (res) {
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const prim of res.primitives) {
        for (let i2 = 0; i2 < prim.positions.length; i2 += 3) {
          for (let k = 0; k < 3; k++) {
            const v = prim.positions[i2 + k];
            if (v < lo[k]) lo[k] = v;
            if (v > hi[k]) hi[k] = v;
          }
        }
      }
      if (Number.isFinite(lo[0])) box = { min: lo, max: hi };
    }
    localBoxCache.set(id, box);
    return box;
  };
  const mul4 = (a, b) => {
    const out = new Array(16).fill(0);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let acc = 0;
        for (let k = 0; k < 4; k++) acc += a[k * 4 + row] * b[col * 4 + k];
        out[col * 4 + row] = acc;
      }
    }
    return out;
  };
  const accumulate = (node, parent) => {
    const world = mul4(parent, node.matrix);
    if (node.meshResourceId !== void 0) {
      const box = localBox(node.meshResourceId);
      if (box) {
        for (let c = 0; c < 8; c++) {
          const x2 = c & 1 ? box.max[0] : box.min[0];
          const y = c & 2 ? box.max[1] : box.min[1];
          const z = c & 4 ? box.max[2] : box.min[2];
          const wx = world[0] * x2 + world[4] * y + world[8] * z + world[12];
          const wy = world[1] * x2 + world[5] * y + world[9] * z + world[13];
          const wz = world[2] * x2 + world[6] * y + world[10] * z + world[14];
          if (wx < bMin[0]) bMin[0] = wx;
          if (wy < bMin[1]) bMin[1] = wy;
          if (wz < bMin[2]) bMin[2] = wz;
          if (wx > bMax[0]) bMax[0] = wx;
          if (wy > bMax[1]) bMax[1] = wy;
          if (wz > bMax[2]) bMax[2] = wz;
        }
      }
    }
    for (const child of node.children) accumulate(child, world);
  };
  accumulate(sceneHierarchy, [...IDENTITY_GLTF]);
  const bounds = Number.isFinite(bMin[0]) ? {
    min: [bMin[0], bMin[1], bMin[2]],
    max: [bMax[0], bMax[1], bMax[2]],
    size: [bMax[0] - bMin[0], bMax[1] - bMin[1], bMax[2] - bMin[2]],
    center: [(bMin[0] + bMax[0]) / 2, (bMin[1] + bMax[1]) / 2, (bMin[2] + bMax[2]) / 2]
  } : null;
  emitLog(
    options,
    "info",
    `Instanced scene build complete: ${instanceCounter.count} instances, ${meshResources.length} mesh resources (${((Date.now() - t0) / 1e3).toFixed(2)}s)`
  );
  return { sceneHierarchy, meshResources, gltfMaterials, textures, bounds, layerHidden: Object.fromEntries(layerHidden) };
}
function stripTextureRefs(materials) {
  let needsCopy = false;
  for (const mat of materials) {
    if (mat?.pbrMetallicRoughness?.baseColorTexture) {
      needsCopy = true;
      break;
    }
  }
  if (!needsCopy) return materials;
  return materials.map((mat) => {
    const pbr = mat?.pbrMetallicRoughness;
    if (!pbr?.baseColorTexture) return mat;
    const restPbr = { ...pbr };
    delete restPbr.baseColorTexture;
    return { ...mat, pbrMetallicRoughness: restPbr };
  });
}
function createGlb(json, binaryBuffer) {
  let jsonString = JSON.stringify(json);
  const jsonRemainder = jsonString.length % 4;
  if (jsonRemainder !== 0) {
    jsonString += " ".repeat(4 - jsonRemainder);
  }
  const jsonBuffer = new TextEncoder().encode(jsonString);
  let paddedBinaryBuffer = binaryBuffer;
  const binaryRemainder = binaryBuffer.length % 4;
  if (binaryRemainder !== 0) {
    const padLength = 4 - binaryRemainder;
    paddedBinaryBuffer = new Uint8Array(binaryBuffer.length + padLength);
    paddedBinaryBuffer.set(binaryBuffer);
  }
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + paddedBinaryBuffer.length;
  const glb = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);
  view.setUint32(0, 1179937895, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonBuffer.length, true);
  view.setUint32(16, 1313821514, true);
  glb.set(jsonBuffer, 20);
  const binHeaderOffset = 20 + jsonBuffer.length;
  view.setUint32(binHeaderOffset, paddedBinaryBuffer.length, true);
  view.setUint32(binHeaderOffset + 4, 5130562, true);
  glb.set(paddedBinaryBuffer, binHeaderOffset + 8);
  return glb;
}
function toInstancedGLB(scene, options) {
  const resources = scene.meshResources || [];
  const gltfMaterials = scene.gltfMaterials || [];
  const sceneTextures = options?.textures ? scene.textures || [] : [];
  const encodedIndices = /* @__PURE__ */ new Map();
  const encodedKey = (resId, primIdx) => `${resId}:${primIdx}`;
  let totalBinaryLength = 0;
  for (const res of resources) {
    for (let i2 = 0; i2 < res.primitives.length; i2++) {
      const prim = res.primitives[i2];
      const encoded = encodeIndices(prim.indices);
      encodedIndices.set(encodedKey(res.id, i2), encoded);
      totalBinaryLength += prim.positions.byteLength;
      totalBinaryLength += prim.normals.byteLength;
      totalBinaryLength += prim.uvs.byteLength;
      totalBinaryLength += encoded.data.byteLength;
      totalBinaryLength += (4 - totalBinaryLength % 4) % 4;
    }
  }
  const imagePlacements = [];
  for (const tex of sceneTextures) {
    totalBinaryLength += (4 - totalBinaryLength % 4) % 4;
    imagePlacements.push({ offset: totalBinaryLength, length: tex.data.length });
    totalBinaryLength += tex.data.length;
  }
  const binaryBuffer = new Uint8Array(totalBinaryLength);
  const bufferViews = [];
  const accessors = [];
  const gltfMeshes = [];
  const meshIndexById = /* @__PURE__ */ new Map();
  let byteOffset = 0;
  for (const res of resources) {
    const gltfPrimitives = [];
    for (let primIdx = 0; primIdx < res.primitives.length; primIdx++) {
      const prim = res.primitives[primIdx];
      const encoded = encodedIndices.get(encodedKey(res.id, primIdx));
      const posByteOffset = byteOffset;
      binaryBuffer.set(
        new Uint8Array(prim.positions.buffer, prim.positions.byteOffset, prim.positions.byteLength),
        posByteOffset
      );
      byteOffset += prim.positions.byteLength;
      const normByteOffset = byteOffset;
      binaryBuffer.set(
        new Uint8Array(prim.normals.buffer, prim.normals.byteOffset, prim.normals.byteLength),
        normByteOffset
      );
      byteOffset += prim.normals.byteLength;
      const uvByteOffset = byteOffset;
      binaryBuffer.set(
        new Uint8Array(prim.uvs.buffer, prim.uvs.byteOffset, prim.uvs.byteLength),
        uvByteOffset
      );
      byteOffset += prim.uvs.byteLength;
      const indByteOffset = byteOffset;
      binaryBuffer.set(
        new Uint8Array(encoded.data.buffer, encoded.data.byteOffset, encoded.data.byteLength),
        indByteOffset
      );
      byteOffset += encoded.data.byteLength;
      byteOffset += (4 - byteOffset % 4) % 4;
      const posBufferViewIdx = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset: posByteOffset,
        byteLength: prim.positions.byteLength,
        target: 34962
        // ARRAY_BUFFER
      });
      const normBufferViewIdx = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset: normByteOffset,
        byteLength: prim.normals.byteLength,
        target: 34962
      });
      const uvBufferViewIdx = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset: uvByteOffset,
        byteLength: prim.uvs.byteLength,
        target: 34962
      });
      const indBufferViewIdx = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset: indByteOffset,
        byteLength: encoded.data.byteLength,
        target: 34963
        // ELEMENT_ARRAY_BUFFER
      });
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i2 = 0; i2 < prim.positions.length; i2 += 3) {
        const x2 = prim.positions[i2];
        const y = prim.positions[i2 + 1];
        const z = prim.positions[i2 + 2];
        if (x2 < minX) minX = x2;
        if (x2 > maxX) maxX = x2;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      if (minX === Infinity) {
        minX = minY = minZ = 0;
        maxX = maxY = maxZ = 0;
      }
      const posAccessorIdx = accessors.length;
      accessors.push({
        bufferView: posBufferViewIdx,
        byteOffset: 0,
        componentType: 5126,
        // FLOAT
        count: prim.positions.length / 3,
        type: "VEC3",
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ]
      });
      const normAccessorIdx = accessors.length;
      accessors.push({
        bufferView: normBufferViewIdx,
        byteOffset: 0,
        componentType: 5126,
        count: prim.normals.length / 3,
        type: "VEC3"
      });
      const uvAccessorIdx = accessors.length;
      accessors.push({
        bufferView: uvBufferViewIdx,
        byteOffset: 0,
        componentType: 5126,
        count: prim.uvs.length / 2,
        type: "VEC2"
      });
      const indAccessorIdx = accessors.length;
      accessors.push({
        bufferView: indBufferViewIdx,
        byteOffset: 0,
        componentType: encoded.componentType,
        count: prim.indices.length,
        type: "SCALAR"
      });
      gltfPrimitives.push({
        attributes: {
          POSITION: posAccessorIdx,
          NORMAL: normAccessorIdx,
          TEXCOORD_0: uvAccessorIdx
        },
        indices: indAccessorIdx,
        material: prim.materialIndex
      });
    }
    if (gltfPrimitives.length === 0) continue;
    meshIndexById.set(res.id, gltfMeshes.length);
    gltfMeshes.push({
      name: res.definitionName || res.id,
      primitives: gltfPrimitives
    });
  }
  const gltfNodes = [];
  const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const isIdentity = (m) => m.length === 16 && m.every((v, i2) => Math.abs(v - IDENTITY[i2]) < 1e-12);
  function emitNode(node) {
    const idx = gltfNodes.length;
    const gltfNode = {};
    if (node.name) gltfNode.name = node.name;
    else if (node.definitionName) gltfNode.name = node.definitionName;
    if (!isIdentity(node.matrix)) {
      gltfNode.matrix = node.matrix;
    }
    const meshIdx = node.meshResourceId !== void 0 ? meshIndexById.get(node.meshResourceId) : void 0;
    if (meshIdx !== void 0) {
      gltfNode.mesh = meshIdx;
    }
    gltfNodes.push(gltfNode);
    if (node.children.length > 0) {
      const childIndices = node.children.map(emitNode);
      gltfNodes[idx].children = childIndices;
    }
    return idx;
  }
  const rootIdx = emitNode(scene.sceneHierarchy);
  const gltfImages = [];
  const gltfTextures = [];
  for (let i2 = 0; i2 < sceneTextures.length; i2++) {
    const tex = sceneTextures[i2];
    const place = imagePlacements[i2];
    binaryBuffer.set(tex.data, place.offset);
    const viewIdx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: place.offset, byteLength: place.length });
    gltfImages.push({ bufferView: viewIdx, mimeType: tex.mimeType });
    gltfTextures.push({ sampler: 0, source: gltfImages.length - 1 });
  }
  const gltfJson = {
    asset: {
      version: "2.0",
      generator: "OpenSKP TypeScript Instanced Exporter"
    },
    scene: 0,
    scenes: [{ nodes: [rootIdx] }],
    nodes: gltfNodes,
    meshes: gltfMeshes,
    materials: sceneTextures.length > 0 ? gltfMaterials : stripTextureRefs(gltfMaterials),
    buffers: [{ byteLength: totalBinaryLength }],
    bufferViews,
    accessors,
    ...gltfImages.length > 0 ? {
      images: gltfImages,
      textures: gltfTextures,
      samplers: [{ wrapS: 10497, wrapT: 10497 }]
      // REPEAT / REPEAT
    } : {}
  };
  return createGlb(gltfJson, binaryBuffer);
}
function hexToBytes(hex) {
  const out = [];
  for (let i2 = 0; i2 < hex.length; i2 += 2) out.push(parseInt(hex.slice(i2, i2 + 2), 16));
  return out;
}
var ISO_CAMERA_PREFIX_PATCH = hexToBytes(
  "594000000000000059c000000000000059400000000000000000000000000000000000000000000000003f2c0c70bd20dabf3f2c0c70bd20da3f3f2c0c70bd20ea3f000000000000f03f0000000000408f40000000000000003e402adf272c803457"
);
var ISO_CAMERA_TAIL_PATCHES = [
  [509, hexToBytes("d0a869613c442d4799a4667d1adfa836")],
  [1390, hexToBytes("4e53c84477029246bba95827bba7e2")]
];
var _TEXTURE_H_SENTINEL = hexToBytes("f0ffffffffffff0f");
var DIM_FONT_PAYLOAD = hexToBytes(
  "000000fffeff065400610068006f006d00610000000800000000ecf57abd5eaf2340"
  // height f64
);
var TEXT_DELIM = hexToBytes("0100000001000300000001");
var CAMERA_TEMPLATE = hexToBytes(
  "00000000000000000000000000000000000000000000f03f000000000000000000000000000000000000000000000000004000000000000000000000000000f03f0000000000000000000000000000000000000000000000000100000000003e40000000000000f03f00000000000000000000000000000000000000000000000000000000000000000100fffeff00000000000000000000000000000000f03f00000000000000000000000000000000"
);
function parseToRaw(buffer, options) {
  const t0 = Date.now();
  const data = new Uint8Array(buffer);
  emitLog(options, "info", `Parsing buffer (${data.length} bytes)`);
  if (!(data.length >= 4 && data[0] === 255 && data[1] === 254 && data[2] === 255 && data[3] === 14)) {
    throw new SkpParseError("Not a valid SketchUp file (bad header magic)", { stage: "header" });
  }
  if (isLegacy(data)) {
    emitLog(options, "debug", "Detected legacy MFC container; routing to legacy walker");
    return parseLegacyToRaw(data, options);
  }
  let contents;
  try {
    contents = extractSkpContents(data, options);
  } catch (e) {
    throw new SkpParseError(`Failed to extract SKP contents: ${e.message}`, {
      stage: "zip_extract",
      cause: e
    });
  }
  const version = contents.version;
  const modelData = contents.modelData;
  const materialFiles = contents.materialFiles;
  emitLog(options, "debug", `Detected version ${version} (VFF/ZIP container)`);
  const units = contents.metaData ? readMetaUnits(contents.metaData) : null;
  const layerColors = /* @__PURE__ */ new Map();
  const layerHidden = /* @__PURE__ */ new Map();
  const materialsMap = /* @__PURE__ */ new Map();
  const materialsByFolder = /* @__PURE__ */ new Map();
  for (const [name, xmlBytes] of Object.entries(materialFiles)) {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith("material.xml") && lowerName.startsWith("materials/")) {
      try {
        const decoder = new TextDecoder("utf-8");
        const xmlText = decoder.decode(xmlBytes);
        const parsedMat = parseMaterialXml(xmlText);
        if (parsedMat) {
          const folderName = name.split("/")[1] || "";
          let texture = null;
          if (parsedMat.hasTexture) {
            const resolved = resolveTextureBytes(
              materialFiles,
              name,
              parsedMat.textureFilename,
              parsedMat.imagePath
            );
            texture = {
              filename: resolved.filename,
              width: parsedMat.xScale,
              height: parsedMat.yScale,
              data: resolved.data
            };
          }
          const matObj = {
            name: parsedMat.name,
            // The VFF material XML record has no alpha attribute - only a
            // separate transparency value (parsedMat.trans, above). Always
            // opaque here; real per-channel alpha only exists in the legacy
            // MFC record (see legacy.ts's own material color assignment).
            color: { r: parsedMat.r, g: parsedMat.g, b: parsedMat.b, a: 255 },
            transparency: parsedMat.trans,
            id: null,
            texture,
            colorized: parsedMat.colorized,
            colorizeType: parsedMat.colorizeType
          };
          materialsMap.set(parsedMat.name, matObj);
          if (folderName) {
            materialsByFolder.set(folderName, matObj);
          }
          if (parsedMat.name.startsWith("Layer_")) {
            layerColors.set(parsedMat.name.slice(6), [parsedMat.r, parsedMat.g, parsedMat.b]);
            layerHidden.set(parsedMat.name.slice(6), false);
          }
        }
      } catch (e) {
        emitLog(options, "debug", `Failed to parse material.xml ${name}: ${e.message}`);
      }
    }
  }
  const styles = [];
  for (const [name, xmlBytes] of Object.entries(materialFiles)) {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith("styles/") && lowerName.endsWith("style.xml")) {
      try {
        const decoder = new TextDecoder("utf-8");
        const xmlText = decoder.decode(xmlBytes);
        const parsedStyle = parseStyleXml(xmlText);
        if (parsedStyle) {
          styles.push({
            name: parsedStyle.name,
            frontColor: parsedStyle.frontColor,
            backColor: parsedStyle.backColor
          });
        }
      } catch (e) {
        emitLog(options, "debug", `Failed to parse style.xml ${name}: ${e.message}`);
      }
    }
  }
  const layerIdToName = /* @__PURE__ */ new Map();
  const materialIdToName = /* @__PURE__ */ new Map();
  function collectMaterialIds(nodes) {
    for (const el of nodes) {
      if (el.tag === "C832") {
        const dc05 = findChildTag(el.children, "DC05");
        const nameNode = findChildTag(el.children, "CC32");
        if (dc05 && nameNode) {
          const payload = dc05.payload;
          let mId;
          if (payload.length >= 6 && payload[0] === 222 && payload[1] === 5) {
            const de05Len = readU32(payload, 2);
            mId = parseVarInt(payload, 6, de05Len);
          } else {
            mId = parseVarInt(payload, 0, payload.length);
          }
          let mName = "";
          try {
            const decoder = new TextDecoder("utf-8");
            mName = decoder.decode(nameNode.payload);
          } catch (e) {
            emitLog(options, "debug", `Failed to decode material name for id ${mId}: ${e.message}`);
          }
          materialIdToName.set(mId, mName);
        }
      }
      if (el.children && el.children.length > 0) {
        collectMaterialIds(el.children);
      }
    }
  }
  emitLog(options, "debug", `Parsed ${materialsMap.size} materials, ${styles.length} styles`);
  const defsDict = /* @__PURE__ */ new Map();
  const rootBuilder = new GeometryBuilder();
  const vertexPositions = /* @__PURE__ */ new Map();
  const instanceWorld = /* @__PURE__ */ new Map();
  let pageNode = null;
  for (const { index, total, node: el } of iterTopLevelLazy(modelData, 0, modelData.length)) {
    try {
      collectLayers([el], layerIdToName, options, layerHidden);
      collectMaterialIds([el]);
      collectDefs([el], defsDict, options);
      scanVertexPositions(el, vertexPositions);
      scanInstanceTransforms(el, instanceWorld);
      if (pageNode === null) {
        pageNode = findPageNode(el);
      }
      if (el.tag === "F601") {
        extractGeometryFromNodes(el.children, rootBuilder, options);
      }
    } catch (e) {
      throw new SkpParseError(`Failed while processing top-level record: ${e.message}`, {
        stage: "tlv_walk",
        recordIndex: index,
        totalRecords: total,
        tag: el.tag,
        cause: e
      });
    }
    if (index % PROGRESS_INTERVAL === 0 || index === total - 1) {
      emitProgress(options, "tlv_walk", index + 1, total);
      emitLog(options, "debug", `Processed ${index + 1}/${total} top-level records`);
    }
  }
  emitLog(
    options,
    "info",
    `Parse complete: ${defsDict.size} defs (${((Date.now() - t0) / 1e3).toFixed(2)}s)`
  );
  if (!layerIdToName.has(1)) {
    layerIdToName.set(1, "Layer0");
  }
  if (!layerColors.has("Layer0")) {
    layerColors.set("Layer0", [136, 136, 136]);
  }
  if (!layerHidden.has("Layer0")) {
    layerHidden.set("Layer0", false);
  }
  defsDict.set("ROOT", {
    guid: "ROOT",
    name: "ROOT_MODEL",
    isImage: false,
    alwaysFacesCamera: false,
    shadowsFaceSun: false,
    builder: rootBuilder
  });
  return {
    version,
    units,
    layerColors,
    layerHidden,
    layerIdToName,
    pages: parsePages(pageNode),
    dimensions: parseDimensions(modelData, vertexPositions, instanceWorld),
    materialIdToName,
    materialsMap,
    materialsByFolder,
    styles,
    defsDict
  };
}
function buildInstancedScene(buffer, options) {
  return buildInstancedSceneFromParsed(parseToRaw(buffer, options), options);
}

// dist/vendor-entry.js
var import_ag_psd = __toESM(require_dist(), 1);
var export_writePsd = import_ag_psd.writePsd;
export {
  buildInstancedScene,
  strToU8,
  toInstancedGLB,
  export_writePsd as writePsd,
  zipSync
};
