Title: Pillow 11.3以降ならAVIFをそのまま保存できる！qualityとspeedを実写真で比較
Date: 2026-09-19 01:37
Category: 技術メモ
Tags: Python, Pillow, AVIF, 画像圧縮, PC
Slug: pillow-avif-built-in-quality-speed
Image: images/2026-02/0211/P_20260211_194528.jpg
Summary: PillowでAVIFを保存するのにpillow-avif-pluginは今も必要なのか。Pillow 12.3.0で標準対応を確認し、qualityとspeedを実写真7枚で比較しました。

PillowでAVIFを保存しようと検索すると、`pillow-avif-plugin`を追加する手順が出てきます。でも、今のPillowでも必要なのでしょうか？

手元のPillow 12.3.0で試したところ、追加プラグインなしでAVIFの保存と読み込みができました。保存だけなら、これでOKです！

```python
from PIL import Image

with Image.open("input.jpg") as image:
    image.convert("RGB").save(
        "output.avif",
        format="AVIF",
        quality=75,
        speed=6,
    )
```

Pillow公式によると、AVIFの読み書きは[Pillow 11.3.0から配布用wheelに入りました](https://pillow.readthedocs.io/en/stable/releasenotes/11.3.0.html#avif-support-in-wheels)。Windows ARM64とiOSは対象外ですが、今回使ったWindows AMD64版では`pip install Pillow`だけで動いています。

## 自分のPillowがAVIF対応か確認する

まずは、今入っているPillowでAVIFが有効になっているかを確認できます。

```python
from PIL import features

print(features.check("avif"))
print(features.version("avif"))
```

今回の環境では、次のように表示されました。

```text
True
1.4.2
```

環境はWindows AMD64、Python 3.10.1、Pillow 12.3.0です。`True`ならAVIF機能が有効で、2行目はPillowが使っているlibavifのバージョンです。

`False`になる場合は、最初にPillowのバージョンとインストール元を確認します。Pillow 11.3.0以降の対応wheelがある環境なら、Pillowを更新してからもう一度確認するのが早いです。

## 実写真7枚でqualityを変えてみた

[CHUWI CoreBook Xの開封記事](/chuwi-corebook-x-review.html)で使っている写真7枚を、縦横比を保ったまま長辺1200pxへ縮小して比べました。元写真は読み取り専用で開き、変換後の画像はメモリ上にだけ作っています。

各設定は1回準備運転をしてから3回保存し、その中央値を取りました。保存時間は7枚分の中央値を合計した値です。

| AVIF保存設定 | 7枚の合計容量 | 保存時間 | PSNRの範囲 |
| --- | ---: | ---: | ---: |
| 既定値（quality=75、speed=6） | 1,106,585 bytes | 698.98 ms | 36.87〜44.97 dB |
| quality=60、speed=6 | 663,485 bytes | 715.10 ms | 33.19〜44.18 dB |
| quality=70、speed=6 | 964,997 bytes | 777.88 ms | 36.09〜44.69 dB |
| quality=80、speed=6 | 1,292,853 bytes | 835.49 ms | 38.07〜45.25 dB |
| quality=90、speed=6 | 1,921,627 bytes | 1,005.80 ms | 41.92〜45.79 dB |

`quality`を上げれば容量も画質指標も上がりました。Pillow公式のAVIF設定は0〜100で、既定値は75です。今回の7枚では、既定値が容量とPSNRの中間にきれいに収まっています。

PSNRは縮小直後のRGB画像との差を数値にしたもので、高いほど元画像との差が小さくなります。ただ、写真ごとの差が大きいので、最後は使う写真を自分の目でも確認したいですね。

## speedを速くすると、容量も増えた

AVIFには`speed`という設定もあります。0が遅くて高品質、10が最速、既定値は6です。

qualityを80に固定して比べると、かなり差が出ました。

| speed | 7枚の合計容量 | 保存時間 | PSNRの範囲 |
| ---: | ---: | ---: | ---: |
| 4 | 1,312,633 bytes | 4,550.27 ms | 38.14〜45.23 dB |
| 6 | 1,292,853 bytes | 835.49 ms | 38.07〜45.25 dB |
| 8 | 1,415,896 bytes | 402.51 ms | 38.07〜45.13 dB |
| 10 | 1,490,585 bytes | 190.62 ms | 37.81〜45.12 dB |

speed=10はspeed=6の約4.4倍速く保存できました。その代わり容量は約15%増え、PSNRも少し下がっています。

反対にspeed=4は、speed=6の約5.4倍も時間がかかりました。それでも容量は小さくならず、PSNRの差もわずかです。今回の写真に限れば、まず既定のspeed=6から試すのが無難そうです。

Pillowで指定できる`quality`、`speed`、色差サブサンプリングなどは、[公式のAVIF保存オプション](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#avif)にまとまっています。

## 同じquality=80でもJPEGより小さいとは限らない

参考として、同じ7枚をJPEGとWebPにも保存しました。

| 形式と設定 | 7枚の合計容量 | 保存時間 | PSNRの範囲 |
| --- | ---: | ---: | ---: |
| AVIF quality=80、speed=6 | 1,292,853 bytes | 835.49 ms | 38.07〜45.25 dB |
| JPEG quality=80、progressive=True | 1,259,719 bytes | 103.29 ms | 32.36〜45.70 dB |
| WebP quality=80、method=4 | 1,146,130 bytes | 1,221.03 ms | 36.23〜44.60 dB |

今回の結果では、AVIFのquality=80はJPEGのquality=80より少し大きくなりました。「AVIFなら設定を変えずに必ず小さくなる」というわけではありません。

そもそも形式が違えば、同じ`quality=80`でも同じ画質にはなりません。容量だけを横に並べて勝ち負けを決めるより、必要な画質に合わせて設定を探す方が使いやすいです。

JPEG側のqualityとprogressiveの違いは、[PillowのJPEG保存設定を実写真で比べた記事](/pillow-jpeg-quality-progressive-comparison.html)に詳しく載せています。

## 元写真を上書きせずに比較できます

[今回使った比較スクリプトをGitHubで公開しています](https://github.com/ligfil-8110/ligfil-8110.github.io/blob/main/scripts/compare_avif_options.py)。引数に写真を渡すと、AVIF、JPEG、WebPの出力をメモリ上に作り、容量、保存時間、PSNRを表示します。

```shell
python -m pip install "Pillow>=11.3"
python scripts/compare_avif_options.py your-photo.jpg --repeats 3
```

複数枚をまとめて渡すこともできます。処理の前後で入力ファイルのSHA-256も確認するので、元写真が変わっていないことまでチェックできます。

Pillow 11.3以降なら、まず追加プラグインを入れずに`features.check("avif")`を試す。対応していれば、そのまま`Image.save()`でAVIFを作れます。あとは既定値のquality=75、speed=6を出発点に、自分の写真で容量と見た目を比べてみてください！
