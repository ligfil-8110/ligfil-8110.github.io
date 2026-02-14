Title: CoreBook Xの環境構築：WSL2とVS Codeで快適な開発環境を整える
Date: 2026-02-13 21:00
Category: 技術メモ
Tags: PC, CoreBook X, WSL2, VSCode, 環境構築
Slug: corebook-x-dev-setup
Summary: OSの再インストールが完了したCoreBook Xに、開発環境を構築しました。WSL2の導入からVS Codeの連携まで、スムーズに進めるための手順をまとめます。

昨日のOS再インストールでクリーンな状態になった **CHUWI CoreBook X** ですが、今日はメインの開発マシンとして使えるように環境構築を行いました。

CoreBook Xはメモリ16GB、CPUもRyzen 5 7430Uと十分なスペックがあるので、Windows上でWSL2を動かしても非常に軽快に動作します。

## 1. WSL2（Ubuntu）のインストール

まずはWindows Subsystem for Linux (WSL2) を導入します。最近のWindows 11なら、コマンドプロンプト（またはPowerShell）を管理者権限で開いて以下のコマンドを打つだけなので本当に楽になりました。

```bash
wsl --install
```

デフォルトでUbuntuがインストールされます。再起動後、ユーザー名とパスワードを設定すれば準備完了です。

## 2. VS CodeとRemote Developmentの導入

Windows側に **Visual Studio Code** をインストールし、拡張機能の「Remote Development」パックを入れます。

これを入れることで、Windows上のVS CodeからWSL2内のファイルを直接編集できるようになります。あたかもLinux上で開発しているかのような操作感で、ビルドやデバッグも思いのままです。

## 3. 日本語環境の設定

WSL2のUbuntuはデフォルトで英語設定なので、日本語を扱えるようにしておきます。

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y language-pack-ja
sudo update-locale LANG=ja_JP.UTF-8
```

これでコマンドのヘルプなども日本語で表示されるようになります。

## 4. パフォーマンスの印象

一通り設定を終えて、Pythonのスクリプトを回したり、Node.jsでプロジェクトを立ち上げてみましたが、**CoreBook Xのファンも静かで、動作も非常にキビキビしています。**

特に、アスペクト比3:2のディスプレイ（2160x1440）が、コードを書く際に垂直方向の視界を広く確保してくれるので、14インチクラスのノートPCとしては破格の作業効率だと感じました。

## まとめ

クリーンインストール直後の環境構築は、不要なプリインストールアプリがない分、非常にスムーズに進みました。

これでブログの執筆だけでなく、ちょっとしたプログラミング作業も外出先で快適にこなせそうです。

明日はバレンタインですね。少しゲームでもしてゆっくり過ごそうと思います！
