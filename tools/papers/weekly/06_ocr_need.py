import json, os
from multiprocessing import Pool
from ocr_all import work
if __name__ == '__main__':
    fs = json.load(open('need_ocr.json', encoding='utf-8'))
    out = json.load(open('some_pages.json', encoding='utf-8'))
    with Pool(7) as pool:
        for p, v in pool.imap_unordered(work, fs):
            out[p] = v; json.dump(out, open('some_pages.json', 'w', encoding='utf-8'), ensure_ascii=False)
            print('ok', os.path.basename(p), flush=True)
    print('done', len(fs))
