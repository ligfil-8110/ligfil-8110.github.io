AUTHOR = 'みっちー'
SITENAME = 'みっちーのブログ'
SITEURL = "https://ligfil-8110.github.io"

PATH = "content"

TIMEZONE = 'Asia/Tokyo'

# 'Japanese' ではなく 'ja' と書くのが一般的です（テーマ側の判定に使われるため）
DEFAULT_LANG = 'ja'

# テーマの指定
THEME = 'themes/foundation'

# --- ページとメニューの設定 ---
DISPLAY_PAGES_ON_MENU = True
DISPLAY_CATEGORIES_ON_MENU = True
# カテゴリ内の記事数を表示
SHOW_CATEGORY_COUNT_ON_SIDEBAR = True

# タグ内の記事数を表示
SHOW_TAG_COUNT_ON_SIDEBAR = True

MARKDOWN = {
    'extension_configs': {
        'markdown.extensions.codehilite': {'css_class': 'highlight'},
        'markdown.extensions.extra': {},
        'markdown.extensions.meta': {},
    },
    'output_format': 'html5',
}

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

TAG_CLOUD_STEPS = 4
TAG_CLOUD_MAX_ITEMS = 10
DISPLAY_PAGES_ON_MENU = True
DISPLAY_CATEGORIES_ON_MENU = True
USE_FOLDER_AS_CATEGORY = True
LINKS_NEXT_PREVIOUS = True
# プラグインの設定を追加
PLUGINS = ['sitemap','neighbors']
# custom.cssを読み込むための設定
CUSTOM_CSS = 'static/css/custom.css'

# 静的ファイルのパスを通す
STATIC_PATHS = ['images', 'css']

# 出力先を指定（テーマの構造に合わせる）
EXTRA_PATH_METADATA = {
    'css/custom.css': {'path': 'theme/css/custom.css'},
}
# Blogroll (サイドバーなどに表示されるリンク)
# 不要なサンプルリンクは消すか、自分のSNSなどに書き換えるとスッキリします
LINKS = (
    ("Google", "https://www.google.com/"),
    ("任天堂公式サイト", "https://www.nintendo.co.jp/"),
    ("RUNNET", "https://runnet.jp/smp/"),
)

# Social widget
SOCIAL = (
    ("GitHub", "https://github.com/ligfil-8110"),
)

DEFAULT_PAGINATION = 7

# 未来の日付の記事は公開しない（ドラフト扱いにする）
WITH_FUTURE_DATES = False

SITEMAP = {
    'format': 'xml',
    'priorities': {
        'articles': 0.8,
        'indexes': 0.5,
        'pages': 0.5
    },
    'changefreqs': {
        'articles': 'monthly',
        'indexes': 'daily',
        'pages': 'monthly'
    }
}