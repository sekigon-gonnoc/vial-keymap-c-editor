# vial-keymap-c-editor

vialの初期キーマップをGUIから設定するためのツールです。 GitHubとの連携を許可することでkeymap.cを読みこみ、編集した結果をコミットできます。

対象リポジトリのファイル構成は下記のようにしてください。
[サンプルはこちらです。](https://github.com/sekigon-gonnoc/auto-kdk-tutorial-data-wired-controller)

```
.github/
└── workflows/
    └── build.yml
target.json
qmk_firmware/
└── keyboards/
    └── <your-keyboards>/
        ├── keyboard.json
        └── keymaps/
            └── vial/
                ├── config.h
                ├── keymap.c
                └── rules.mk
```

> [!tips]
> 1つのリポジトリあたりのキーボード/キーマップは1つだけにしてください。
> 複数のキーボードやキーマップを切り替えたい場合はブランチを切り替えてください。

| 機能                     | 対応状況 |
| ------------------------ | -------- |
| キーマップ               | ✔        |
| タップダンス             | ✔        |
| コンボ                   | ✔        |
| マクロ                   | 🚧        |
| オーバーライド           | 🚧        |
| レイヤ数やコンボ数の変更 | 🚧        |