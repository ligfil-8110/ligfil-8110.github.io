Title: PillowでPNGのqualityを下げても小さくならない？保存設定を実測で比較
Date: 2026-09-15 01:30
Modified: 2026-09-15 06:55
Category: 技術メモ
Tags: Python, Pillow, 画像圧縮, PC
Slug: pillow-png-quality-compress-level
Image: images/2026-09/pillow-png-compression-comparison.png
Summary: PNG保存のquality、compress_level、optimizeを同じ画像で比較。容量と復号後の画素を確認し、原本を変更しない再現スクリプトも公開します。
en_url: en/pillow-png-compression.html

PNGを小さくしたくて、Pillowの`quality`を下げる。でも容量が変わらない……。JPEGと同じつもりで使うと、ちょっとややこしいですね！

今回の比較では、PNGの`quality=10`と`quality=90`は、指定なしとファイルの中身まで同じでした！PNGで容量を調整するなら、使うのは`compress_level`や`optimize`の方です。

今回はこのブログの作業環境で、Codexにスクリプトを実行してもらいました（2026年9月15日）。結果と、手元でも試せるコードを載せておきますね！

まずは写真で試した結果を図にしました。

## PNGを小さくするなら？

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

まずは640×480ピクセルのRGB画像です。色が変化する部分と四角い境界がある画像を、スクリプトで作っています。同じコードなら同じ画像になるので、比較しやすいですね！

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

`quality`を変えた3つは、容量だけでなく中身まで同じでした。下げても変わらないわけですね……！保存時間のわずかな差は、実行のたびに揺れます。

`optimize=True`の2つも同じです。こちらを付けると圧縮レベルは9になるので、level=1を添えても軽い圧縮にはならないんですね。

次は写真でも比較です！[CHUWI CoreBook Xの開封記事](/chuwi-corebook-x-review.html)にあるキーボードのJPEG写真を、RGBへ変換して640×480の枠内に縮小しました。この縮小後の562×480の画像を、各設定でPNGに保存しています。

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

写真でも`quality`の3つと、`optimize=True`の2つはそれぞれ同じでした。

ただ、指定なしから`optimize=True`にしても、小さくなったのは約1.9%。保存時間は約5.6倍です。これだけ時間が増えて、減るのはそれだけなのか……！画像によって結構違いがありそうですね。

Pillowの[PNG保存の速度に関するIssue](https://github.com/python-pillow/Pillow/issues/5986)でも、圧縮設定の話が出ています。保存に時間がかかっている方は、こちらも参考になると思います！

## 画質は落ちていないの？

各PNGをもう一度読み込み、画像サイズ・モード・全画素の値を比較しました。今回の16出力では、すべて入力と一致しています。

画質を下げたのではなく、同じ画素を別の圧縮設定で保存しているわけですね！写真の方は、RGB変換と縮小を済ませた画像との比較です。

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

今回の写真だと、`optimize=True`で減った容量は意外と少なかったですね……。

PNGを小さくしたいときは、まず画像の縦横サイズが大きすぎないか。そのあとに圧縮設定を比べてみるとよさそうです。毎回`optimize=True`にするかは、容量と処理時間を見て決めたいところですね！
