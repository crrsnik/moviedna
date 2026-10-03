from pathlib import Path
from math import cos, sin, pi

OUT = Path("public/achievements")
OUT.mkdir(parents=True, exist_ok=True)

# id, icon, accent, frame, tier
BADGES = [
    ("onboarding_complete", "check",   "#8b5cf6", "circle",  1),
    ("dna_ready",           "dna",     "#d946ef", "diamond", 1),

    ("rating_1",            "star",    "#f59e0b", "hex",     1),
    ("rating_10",           "star",    "#f59e0b", "hex",     2),
    ("rating_25",           "star",    "#f59e0b", "hex",     3),
    ("rating_50",           "star",    "#f97316", "hex",     4),
    ("rating_100",          "star",    "#ef4444", "hex",     5),

    ("watched_1",           "play",    "#38bdf8", "circle",  1),
    ("watched_10",          "play",    "#38bdf8", "circle",  2),
    ("watched_25",          "play",    "#3b82f6", "circle",  3),
    ("watched_50",          "play",    "#2563eb", "circle",  4),
    ("watched_100",         "play",    "#6366f1", "circle",  5),

    ("movies_10",           "movie",   "#f87171", "square",  2),
    ("movies_50",           "movie",   "#ef4444", "square",  4),

    ("tv_10",               "tv",      "#22d3ee", "square",  2),
    ("tv_50",               "tv",      "#06b6d4", "square",  4),

    ("favorite_1",          "heart",   "#f472b6", "circle",  1),
    ("favorite_10",         "heart",   "#ec4899", "circle",  2),
    ("favorite_25",         "heart",   "#e11d48", "circle",  3),

    ("genres_5",            "genres",  "#34d399", "diamond", 2),
    ("genres_10",           "genres",  "#10b981", "diamond", 4),

    ("decades_3",           "time",    "#2dd4bf", "arch",    2),
    ("decades_5",           "time",    "#14b8a6", "arch",    4),

    ("countries_3",         "globe",   "#a3e635", "circle",  2),
    ("countries_5",         "globe",   "#84cc16", "circle",  4),

    ("horror_10",           "horror",  "#a855f7", "arch",    3),
    ("comedy_10",           "comedy",  "#facc15", "circle",  3),
    ("scifi_10",            "scifi",   "#818cf8", "diamond", 3),
    ("romance_10",          "rose",    "#fb7185", "circle",  3),

    ("friend_1",            "friends", "#a78bfa", "square",  1),
    ("friends_5",           "friends", "#8b5cf6", "square",  3),
    ("friends_10",          "friends", "#7c3aed", "square",  5),
]

BG = "#18181b"
LINE = "#f4f4f5"
MUTED = "#52525b"


def star_points(cx=128, cy=119, outer=42, inner=19):
    points = []
    for i in range(10):
        a = -pi / 2 + i * pi / 5
        r = outer if i % 2 == 0 else inner
        points.append(
            f"{cx + cos(a) * r:.1f},{cy + sin(a) * r:.1f}"
        )
    return " ".join(points)


def frame(kind, accent):
    if kind == "circle":
        return f'''
        <circle cx="128" cy="128" r="96"
          fill="{BG}"
          stroke="{accent}"
          stroke-width="7"/>
        '''

    if kind == "square":
        return f'''
        <rect x="34" y="34" width="188" height="188" rx="44"
          fill="{BG}"
          stroke="{accent}"
          stroke-width="7"/>
        '''

    if kind == "diamond":
        return f'''
        <path d="M128 27 L229 128 L128 229 L27 128 Z"
          fill="{BG}"
          stroke="{accent}"
          stroke-width="7"
          stroke-linejoin="round"/>
        '''

    if kind == "hex":
        return f'''
        <path d="M76 38
                 L180 38
                 L232 128
                 L180 218
                 L76 218
                 L24 128 Z"
          fill="{BG}"
          stroke="{accent}"
          stroke-width="7"
          stroke-linejoin="round"/>
        '''

    if kind == "arch":
        return f'''
        <path d="M45 210
                 V114
                 C45 60 81 30 128 30
                 C175 30 211 60 211 114
                 V210
                 Z"
          fill="{BG}"
          stroke="{accent}"
          stroke-width="7"
          stroke-linejoin="round"/>
        '''

    raise ValueError(kind)


def icon(kind, accent):
    stroke = (
        f'fill="none" stroke="{LINE}" '
        'stroke-width="11" stroke-linecap="round" '
        'stroke-linejoin="round"'
    )

    if kind == "check":
        return f'''
        <path d="M85 128l29 29 58-67" {stroke}/>
        <circle cx="128" cy="124" r="59"
          fill="none"
          stroke="{accent}"
          stroke-width="5"
          stroke-dasharray="4 14"/>
        '''

    if kind == "dna":
        return f'''
        <path d="M96 78c47 24 47 69 0 94" {stroke}/>
        <path d="M160 78c-47 24-47 69 0 94" {stroke}/>
        <path d="M107 91h42
                 M99 114h58
                 M99 138h58
                 M107 160h42"
          stroke="{accent}"
          stroke-width="6"
          stroke-linecap="round"/>
        '''

    if kind == "star":
        return f'''
        <polygon
          points="{star_points()}"
          fill="{accent}"/>
        <circle cx="128" cy="119" r="55"
          fill="none"
          stroke="{LINE}"
          stroke-opacity=".16"
          stroke-width="3"/>
        '''

    if kind == "play":
        return f'''
        <circle cx="128" cy="123" r="57"
          fill="{accent}"/>
        <path d="M112 92l48 31-48 31z"
          fill="{BG}"/>
        '''

    if kind == "movie":
        return f'''
        <rect x="79" y="98" width="98" height="67" rx="10"
          {stroke}/>
        <path d="M80 98l12-31h95l-11 31"
          {stroke}/>
        <path d="M109 69l-11 27
                 M143 69l-11 27
                 M176 69l-11 27"
          stroke="{accent}"
          stroke-width="7"/>
        '''

    if kind == "tv":
        return f'''
        <rect x="76" y="87" width="104" height="76" rx="14"
          {stroke}/>
        <path d="M105 70l23 17 23-17"
          {stroke}/>
        <rect x="91" y="102" width="74" height="46" rx="7"
          fill="{accent}"/>
        '''

    if kind == "heart":
        return f'''
        <path d="M128 174
                 C108 151 79 134 79 104
                 C79 82 105 70 128 94
                 C151 70 177 82 177 104
                 C177 134 148 151 128 174Z"
          fill="{accent}"/>
        '''

    if kind == "genres":
        return f'''
        <circle cx="102" cy="103" r="31"
          fill="{accent}"/>
        <circle cx="154" cy="103" r="31"
          fill="{LINE}"/>
        <circle cx="102" cy="153" r="31"
          fill="{LINE}"/>
        <circle cx="154" cy="153" r="31"
          fill="{accent}"/>
        '''

    if kind == "time":
        return f'''
        <path d="M98 77h60
                 M98 175h60"
          {stroke}/>
        <path d="M106 82
                 C106 106 114 112 128 123
                 C142 112 150 106 150 82
                 M106 170
                 C106 146 114 140 128 129
                 C142 140 150 146 150 170"
          {stroke}/>
        <circle cx="128" cy="126" r="6"
          fill="{accent}"/>
        '''

    if kind == "globe":
        return f'''
        <circle cx="128" cy="125" r="55" {stroke}/>
        <path d="M73 125h110
                 M128 70v110"
          {stroke}/>
        <path d="M128 70
                 C102 91 102 159 128 180
                 M128 70
                 C154 91 154 159 128 180"
          fill="none"
          stroke="{accent}"
          stroke-width="7"/>
        '''

    if kind == "horror":
        return f'''
        <path d="M158 76
                 C116 76 89 103 94 138
                 C98 165 122 179 151 166
                 C128 158 118 143 118 123
                 C118 102 131 85 158 76Z"
          fill="{accent}"/>
        <circle cx="158" cy="117" r="7"
          fill="{LINE}"/>
        '''

    if kind == "comedy":
        return f'''
        <circle cx="128" cy="123" r="56"
          fill="{accent}"/>
        <circle cx="108" cy="111" r="6"
          fill="{BG}"/>
        <circle cx="148" cy="111" r="6"
          fill="{BG}"/>
        <path d="M99 137c16 23 42 23 58 0"
          fill="none"
          stroke="{BG}"
          stroke-width="9"
          stroke-linecap="round"/>
        '''

    if kind == "scifi":
        return f'''
        <circle cx="128" cy="124" r="30"
          fill="{accent}"/>
        <ellipse cx="128" cy="124"
          rx="69" ry="25"
          fill="none"
          stroke="{LINE}"
          stroke-width="9"
          transform="rotate(-16 128 124)"/>
        <circle cx="181" cy="91" r="8"
          fill="{LINE}"/>
        '''

    if kind == "rose":
        return f'''
        <circle cx="128" cy="112" r="34"
          fill="{accent}"/>
        <path d="M128 146v42
                 M128 165l-25-14
                 M128 172l25-15"
          {stroke}/>
        <path d="M104 112
                 C115 90 140 90 151 112
                 C140 134 115 134 104 112Z"
          fill="{BG}"
          fill-opacity=".32"/>
        '''

    if kind == "friends":
        return f'''
        <circle cx="105" cy="103" r="22"
          fill="{accent}"/>
        <circle cx="151" cy="103" r="22"
          fill="{LINE}"/>
        <path d="M68 171
                 C71 138 87 123 111 123
                 C134 123 150 138 153 171Z"
          fill="{accent}"/>
        <path d="M128 171
                 C131 142 145 129 166 129
                 C186 129 199 142 202 171Z"
          fill="{LINE}"
          fill-opacity=".9"/>
        '''

    raise ValueError(kind)


def tier_marks(tier, accent):
    width = 12
    gap = 7
    total = tier * width + (tier - 1) * gap
    start = 128 - total / 2

    bars = []

    for i in range(tier):
        bars.append(
            f'<rect x="{start + i * (width + gap):.1f}" '
            f'y="200" width="{width}" height="5" rx="2.5" '
            f'fill="{accent}"/>'
        )

    return "\n".join(bars)


def svg(icon_name, accent, frame_name, tier):
    return f'''<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 256 256"
>
  {frame(frame_name, accent)}

  <path
    d="M52 57L204 199"
    stroke="{accent}"
    stroke-width="3"
    stroke-opacity=".12"
  />

  <path
    d="M52 199L204 57"
    stroke="{accent}"
    stroke-width="3"
    stroke-opacity=".07"
  />

  {icon(icon_name, accent)}

  {tier_marks(tier, accent)}
</svg>
'''


for badge_id, icon_name, accent, frame_name, tier in BADGES:
    (OUT / f"{badge_id}.svg").write_text(
        svg(
            icon_name,
            accent,
            frame_name,
            tier,
        )
    )

print(f"Generated {len(BADGES)} minimalist badges.")
