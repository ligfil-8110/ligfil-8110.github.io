Title: jpgなのに中身はPNG？Pillowで画像の形式を確かめて変換する方法
Date: 2026-10-05
Category: 技術メモ
Tags: Python, Pillow, JPEG, PNG, 画像処理
Slug: jpg-actually-png-pillow
Summary: 拡張子が.jpgでも実体がPNGの画像をPillowで見分ける方法。名前の変更と本当のJPEG変換を、原本を残した隔離実験で比べました。

「.jpgのはずなのに、画像の形式が合わない」。そんなときは、ファイル名を直す前に**画像の中身**を確認してみてください。拡張子が`.jpg`でも、実体はPNGということがあります。

結論から言うと、Pillowの`Image.open()`で開いた画像の`format`を見れば判別できます。`.jpg`を`.png`に**名前だけ変更しても中身は変わりません**。JPEGが必要なら、別ファイルへJPEG形式で保存し直します。

## 拡張子ではなく、画像の形式を確認する

PythonとPillowを使います。Pillowがまだない環境なら、`python -m pip install Pillow`で導入できます。次の`sample.jpg`は調べたいファイル名に置き換えてください。

```python
from pathlib import Path
from PIL import Image

source = Path("sample.jpg")
with Image.open(source) as image:
    print(source.suffix, image.format, image.mode, image.size)
```

この検証で使った画像では、出力は`.jpg PNG RGB (3840, 2160)`でした。名前はJPGでも、Pillowが読んだ形式はPNGです。ファイル先頭もPNGの署名`89 50 4e 47 0d 0a 1a 0a`でした。[Pillow公式の形式資料](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html)でも、開くときはファイル名ではなく内容から形式を識別すると説明されています。

手元に試せる画像がない場合は、次のコードで小さなグラデーションを作れます。`sample.jpg`という名前ですが、中身は意図的にPNGです。既に同名のファイルがある場所では実行せず、空の作業フォルダーで試してください。

```python
from pathlib import Path
from PIL import Image

sample = Image.new("RGB", (128, 96))
for y in range(96):
    for x in range(128):
        sample.putpixel((x, y), ((x * 2) % 256, (y * 2) % 256, (x + y) % 256))
with Path("sample.jpg").open("xb") as stream:
    sample.save(stream, format="PNG")
```

## 名前を変えるだけか、JPEGに変換するか

PNGのままでよく、受け付け先もPNGに対応しているなら、**原本を残してコピーの拡張子を`.png`に直す**方法があります。実験では自作画像`sample.jpg`を`renamed.png`にコピーしても、両方の中身はPNGで、バイト列まで同じでした。受け付け先がJPEGを指定しているなら、これでは解決しません。

JPEGが必要な場合は、実際にJPEGとして保存します。次のコードはRGB画像だけを対象にして、`sample-converted.jpg`という**新しいファイル**を作ります。既に同名のファイルがあれば上書きせずエラーになります。

```python
from pathlib import Path
from PIL import Image

source = Path("sample.jpg")
output = Path("sample-converted.jpg")

with Image.open(source) as image:
    if image.mode != "RGB":
        raise ValueError("RGB以外は透過や色を確認してから変換してください")
    with output.open("xb") as stream:
        image.save(stream, format="JPEG", quality=85)

with Image.open(output) as image:
    print(output.suffix, image.format, image.size)
```

検証用画像では`.jpg JPEG (128, 96)`と表示され、先頭バイトもJPEGの`ff d8 ff`に変わりました。`Image.save()`は通常、保存先の拡張子から形式を選びますが、この例では`format="JPEG"`も明示しています。詳しくは[Pillow公式チュートリアル](https://pillow.readthedocs.io/en/stable/handbook/tutorial.html#reading-and-writing-images)を参照してください。

## 実験では小さくならない画像もあった

2026年10月5日にWindows、Python 3.10.1、Pillow 12.3.0で確認しました。原本は読み取り専用で扱い、変換先は使い捨ての作業ディレクトリです。

| 入力と操作 | Pillowの判定 | 容量 |
| --- | --- | ---: |
| 当サイトの画像素材：`.jpg`の原本、3840×2160px | PNG | 4,155,175 bytes |
| 同じ画像を寸法そのまま`quality=85`で別名保存 | JPEG | 643,250 bytes |
| 自作の128×96pxグラデーションを`.jpg`名でPNG保存 | PNG | 403 bytes |
| 自作画像を`.png`名へコピー | PNG | 403 bytes |
| 自作画像を`quality=85`でJPEG保存 | JPEG | 1,609 bytes |

実素材ではJPEGへの保存で容量が減りましたが、小さな自作画像では**JPEGのほうが大きく**なりました。名前だけ変えたコピーは元と完全に同じバイト列です。JPEGに変換した画像の画素は元のPNGと完全一致せず、非可逆圧縮になります。実素材は変換前後で寸法が同じで、1280×720pxに縮小して見た範囲では画面の文字を読めました。ただし、すべての画像で容量や見た目が同じ結果になるわけではありません。原本のハッシュは実験前後で変わっていません。

透過のあるPNGなどRGB以外の画像は、このコードでは意図的に止めます。JPEGは透過を保持できないため、背景色を決めずに機械的に変換しないほうが安全です。また、変換後に画像を掲載する場合は、ファイル名だけでなく記事内の参照先も新しいファイルへ合わせてください。

なお、古いPythonの例にある`imghdr`は、[Python公式資料](https://docs.python.org/3/library/imghdr.html)によるとPython 3.13で削除されています。ここで試したのはPython 3.10.1ですが、形式確認には既に使っているPillowの`format`を使いました。

形式を揃えたあと、JPEGの`quality`や`progressive`で容量がどう変わるかは、[写真7枚で比較した記事](/pillow-jpeg-quality-progressive-comparison.html)にまとめています。PNGを使い続ける場合は、[PNGの保存設定を比べた記事](/pillow-png-quality-compress-level.html)も参考にしてください。
