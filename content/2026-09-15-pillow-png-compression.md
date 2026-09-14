Title: PillowでPNGのqualityを下げても小さくならない？保存設定を実測で比較
Date: 2026-09-15 01:30
Category: 技術メモ
Tags: Python, Pillow, 画像圧縮, PC
Slug: pillow-png-quality-compress-level
Summary: PNG保存のquality、compress_level、optimizeを同じ画像で比較。容量と復号後の画素を確認し、原本を変更しない再現スクリプトも公開します。

PythonでPNGを保存するとき、`quality=10`にしてもファイルが小さくならない。JPEGと同じつもりで指定すると、ここで引っかかります。

今回、ブログの作業環境で比較したところ、PNGの`quality=10`と`quality=90`は、指定なしとファイルの中身まで一致しました。PNGの保存で調整するのは、まず`compress_level`や`optimize`です。`optimize=True`なら、`compress_level=1`を添えても軽い圧縮にはなりません。

以下は2026年9月15日に、このリポジトリ上でCodexが実行した検証記録です。筆者が別のPCで手作業測定した結果ではありません。

## PNGなら、この指定から確認

容量を優先する場合の保存例です。原本とは別のファイル名にしています。

```python
from PIL import Image

with Image.open("input.png") as image:
    image.save("output-optimized.png", format="PNG", optimize=True)
```

処理時間も比較したいなら、`optimize`を付けずに圧縮レベルを変えます。

```python
with Image.open("input.png") as image:
    image.save("output-level1.png", format="PNG", compress_level=1)
    image.save("output-level6.png", format="PNG", compress_level=6)
    image.save("output-level9.png", format="PNG", compress_level=9)
```

`compress_level`は0〜9、既定値は6です。`optimize=True`では圧縮レベルが9になり、渡したレベル値は使われません。[Pillow公式のPNG保存オプション](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#png)で確認できます。JPEGの`quality`を、PNGの画質調整だと思って使わないのがポイントです。

## 同じ画像で比べた結果

環境はWindows、Python 3.10.1、Pillow 12.3.0、zlib 1.2.11。各設定で最初の1回を準備運転とし、その後5回の保存時間の中央値を取りました。画像の読み込み・縮小・復号時間は含めていません。

まずは誰でも再現できる640×480ピクセルのRGB画像を、スクリプト内で作りました。色の変化と四角い境界を持つ人工画像で、写真を代表するものではありません。

| 保存設定 | 容量（bytes） | 保存時間（ms） |
| --- | ---: | ---: |
| 指定なし | 2,639 | 3.70 |
| quality=10 | 2,639 | 3.76 |
| quality=90 | 2,639 | 3.98 |
| compress_level=0 | 922,446 | 4.63 |
| compress_level=1 | 11,293 | 4.17 |
| compress_level=9 | 2,199 | 6.42 |
| optimize=True、level=1 | 2,199 | 6.95 |
| optimize=True、level=9 | 2,199 | 6.81 |

`quality`を変えた3つの出力はバイト単位で同じでした。`optimize=True`の2つも同じです。数msの差だけを見て、qualityの指定で高速化したとは判断できません。

人工画像だけでは偏るので、[CHUWI CoreBook Xの開封記事](/chuwi-corebook-x-review.html)にあるキーボードのJPEG写真も読み込み、RGBへ変換して640×480の枠内に縮小しました。比較対象は縮小後の562×480の画素であり、元のJPEG写真の品質や容量との比較ではありません。

| 写真由来の入力の保存設定 | 容量（bytes） | 保存時間（ms） |
| --- | ---: | ---: |
| 指定なし | 316,511 | 20.43 |
| quality=10 | 316,511 | 19.99 |
| quality=90 | 316,511 | 19.81 |
| compress_level=0 | 810,092 | 5.12 |
| compress_level=1 | 457,345 | 7.37 |
| compress_level=9 | 310,636 | 114.81 |
| optimize=True、level=1 | 310,398 | 115.47 |
| optimize=True、level=9 | 310,398 | 113.64 |

こちらも`quality`の3出力と、`optimize=True`の2出力はそれぞれ一致しました。ただ、指定なしから`optimize=True`にしても容量削減は約1.9%。保存時間は約5.6倍でした。小さくなる量に対して、処理時間が結構増えていますね。

海外の[PNG保存の速度に関するPillow Issue](https://github.com/python-pillow/Pillow/issues/5986)にも圧縮設定の話がありますが、他のライブラリとの速度差はここでは測っていません。この2入力の結果を、どんな画像にも当てはめることはできません。

## 画質は落ちていないの？

各PNGをもう一度読み込み、画像サイズ・モード・全画素の値を比較しました。今回の16出力では、すべて入力と一致しています。

つまり、この保存設定の比較では「画質を下げて小さくした」のではなく、「同じ画素を別の圧縮設定で保存した」ということです。ただし、写真を読み込んだときのRGB変換と縮小は別の処理です。原本から一切変化がない、という意味ではありません。

透過PNG、パレット画像、16bit画像、APNGは今回の比較対象外です。後述の写真入力モードはRGBに変換するため、透過を保持する用途にはそのまま使わないでください。

## 手元の画像でも再現する

[比較スクリプトの全体をGitHubで公開しています](https://github.com/ligfil-8110/ligfil-8110.github.io/blob/main/scripts/compare_png_options.py)。Python 3.10以上の環境で、必要なら仮想環境にPillowを入れてください。

リンク先のファイルをダウンロードし、作業フォルダー内のscriptsフォルダーにcompare_png_options.pyという名前で保存します。以下のコマンドは、その作業フォルダーで実行してください。

```shell
python -m pip install Pillow==12.3.0
python scripts/compare_png_options.py
```

画像を渡さなければ、表の人工画像を使います。画像ファイルもログもディスクに書かず、メモリ内で保存・復号し、結果を表示します。

自分の写真で比較する場合は、ファイルを引数に渡します。

```shell
python scripts/compare_png_options.py your-photo.jpg --repeats 5
```

元画像は読み取り専用で開き、向きの補正・RGB変換・縮小はメモリ上で行います。写真の結果は入力画像によって変わります。時間もPCや負荷で揺れるので、容量と画素一致を見たうえで、自分の処理に必要な設定を選んでください。

ブログ用の画像なら、毎回`optimize=True`を付ければ正解、というわけでもなさそうです。画素サイズが用途に合っているかを先に確認し、その後に圧縮設定の容量と時間を比べる。今回のように、追加の処理時間ほど容量が減らないケースもあります。

この検証で分かったのはPNG保存の挙動までです。サイト表示の高速化や、検索順位・広告収益の向上を測定した結果ではありません。
