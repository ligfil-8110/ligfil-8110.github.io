Title: PillowでJPEGを小さくするなら？qualityとprogressiveを実写真7枚で比較
Date: 2026-09-18 01:38
Category: 技術メモ
Tags: Python, Pillow, JPEG, 画像圧縮, PC
Slug: pillow-jpeg-quality-progressive-comparison
Image: images/2026-02/0211/P_20260211_194528.jpg
Summary: PillowのJPEG保存でquality、optimize、progressiveを変えると容量と処理時間はどう変わるのか。実写真7枚を同じ1200pxへ縮小して比較しました。
en_url: en/pillow-jpeg-quality-progressive.html

PillowでJPEGを軽くするとき、`quality`はいくつがいいのか。`optimize=True`や`progressive=True`も付けた方がいいのか。指定が増えてくると、どれが効いているのか分かりにくいですよね……。

このブログで使っている写真7枚を同じ長辺1200pxへ縮小し、保存条件だけを変えて比べてみました！

先に結果を書くと、今回の写真では`quality=80, progressive=True`が合計1,259,719 bytes。`quality=95`の2,887,101 bytesから56.4%小さくなりました。`optimize=True`も一緒に付けましたが、progressiveだけの場合と容量は同じでした。

```python
image.save("output.jpg", quality=80, progressive=True)
```

## 実写真7枚で比べた結果

入力にしたのは、[CHUWI CoreBook Xの開封記事](/chuwi-corebook-x-review.html)で使っているJPEG写真7枚です。元は4096×3072pxなどの写真で、向きを補正してRGBへ変換し、縦横比を保ったまま長辺1200pxへ縮小しています。

各条件は最初の1回を準備運転にし、その後5回保存した中央値を取りました。表の保存時間は7枚分の中央値を合計した値で、読み込みと縮小の時間は含めていません。

環境はWindows、Python 3.10.1、Pillow 12.3.0です。

| JPEG保存設定 | 7枚の合計容量 | quality=95比 | 保存時間 | PSNRの範囲 |
| --- | ---: | ---: | ---: | ---: |
| quality=95 | 2,887,101 bytes | 基準 | 20.60 ms | 41.52〜48.85 dB |
| quality=90 | 2,016,298 bytes | -30.2% | 17.96 ms | 36.78〜47.28 dB |
| quality=85 | 1,604,818 bytes | -44.4% | 16.01 ms | 34.05〜46.39 dB |
| quality=80 | 1,360,948 bytes | -52.9% | 15.21 ms | 32.36〜45.70 dB |
| quality=75 | 1,185,632 bytes | -58.9% | 14.73 ms | 31.25〜45.25 dB |
| quality=80、optimize=True | 1,318,954 bytes | -54.3% | 41.37 ms | 32.36〜45.70 dB |
| quality=80、progressive=True | 1,259,719 bytes | -56.4% | 97.02 ms | 32.36〜45.70 dB |
| quality=80、optimize=True、progressive=True | 1,259,719 bytes | -56.4% | 103.03 ms | 32.36〜45.70 dB |

もう一度同じ条件で実行しても、全設定の容量とPSNRは同じでした。保存時間は少し揺れ、たとえばquality=80は15.21〜16.03ms、progressiveは97.02〜98.30msでした。

## qualityを下げると、どこまで小さくなる？

quality=95から90へ下げただけでも、7枚の合計は約30%減りました。quality=80では約53%減です。

その代わり、JPEGは非可逆圧縮なので復号後の画素は変わります。表のPSNRは縮小直後のRGB画像を基準に計算した値で、高いほど基準画像との差が小さくなります。

今回の写真ではquality=80のPSNRが32.36〜45.70dB、quality=75では31.25〜45.25dBでした。写真によって差があるので、容量だけで決めず、実際に使う画像も見て選びたいところです。

Pillow公式ではJPEGのqualityは0〜95で、既定値は75。95を超える値は容量が大きくなる割に画質の向上が少ないため避けるよう案内されています。詳しい保存オプションは[Pillow公式のJPEG Saving](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#jpeg-saving)で確認できます。

## optimizeとprogressiveは何が変わった？

quality=80に`optimize=True`を付けると、1,360,948 bytesから1,318,954 bytesへ約3.1%減りました。保存時間は15.21msから41.37msへ増えています。

`progressive=True`では1,259,719 bytesまで小さくなりました。ただし保存時間は97.02msです。容量はさらに減りましたが、今回の条件では保存処理に時間がかかりました。

そして`optimize=True, progressive=True`の組み合わせは、progressiveだけの場合とバイト単位で同じ容量でした。2回試して同じ結果です。少なくとも今回の7枚では、両方を付けたからさらに小さくなる、という結果にはなりませんでした。

Pillow公式の説明では、`optimize`は最適なエンコーダー設定を選ぶための追加パス、`progressive`は段階的に表示できるJPEGとして保存する指定です。役割は別ですが、容量への効き方は画像や環境を含めて実際に比べるのが確実ですね！

## 縮小してからJPEGで保存するコード

長辺だけを決めて縦横比を保つなら、次のように書けます。`ImageOps.exif_transpose()`はスマホ写真などのEXIF Orientationを画素へ反映します。

```python
from PIL import Image, ImageOps

with Image.open("input.jpg") as original:
    image = ImageOps.exif_transpose(original).convert("RGB")

if max(image.size) > 1200:
    scale = 1200 / max(image.size)
    image = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )

image.save("output.jpg", quality=80, progressive=True)
```

`resize()`のフィルターや`reducing_gap`は[Pillow公式のImage.resize()](https://pillow.readthedocs.io/en/stable/reference/Image.html#PIL.Image.Image.resize)、写真の向き補正は[ImageOps.exif_transpose()](https://pillow.readthedocs.io/en/stable/reference/ImageOps.html#PIL.ImageOps.exif_transpose)に説明があります。

## 自分の写真でも比較できます

[今回の比較スクリプトをGitHubで公開しています](https://github.com/ligfil-8110/ligfil-8110.github.io/blob/main/scripts/compare_jpeg_options.py)。入力画像は読み取り専用で開き、JPEG出力はメモリ上に作るため、元ファイルは上書きしません。

```shell
python -m pip install Pillow==12.3.0
python scripts/compare_jpeg_options.py your-photo.jpg --repeats 5
```

引数なしなら、スクリプト内で作る同じRGB画像を使って動作確認できます。複数の写真を渡すと、合計容量とPSNRの範囲をまとめて表示します。

PNGの`quality`を変えても容量が変わらない理由は、[PillowでPNGの保存設定を比べた記事](/pillow-png-quality-compress-level.html)にまとめました。JPEGとPNGでは、同じ`quality`という名前でも挙動が違います。

Webサイト用のJPEGなら、まず表示に必要な縦横サイズへ縮小する。そのうえでqualityとprogressiveを、自分の写真で比べて決める。この順番が分かりやすいですね！
