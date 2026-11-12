import os
import re
import random
import glob

gen_alpha_ids = [
    "1608658125505-319a34496f06",
    "1635552322112-0194846b0d75",
    "1706466615917-e44750d177d7",
    "1552549505-e47bad1806d0",
    "1493711662062-fa541adb3fc8",
    "1511512578047-dfb367046420",
    "1534423861386-85a16f5d13fd",
    "1509198397868-475647b2a1e5",
    "1619045119136-349759036541",
    "1563664829727-84b679bb2dae",
    "1649675211216-bf4b26942b88",
    "1730222348142-a9fcf6d571c7",
    "1562050135-47f322ec9257",
    "1550745165-9bc0b252726f",
    "1611162617474-5b21e879e113",
    "1614680376573-3e4e114dca92",
    "1579546929518-9e396f3cc809",
    "1585834697738-983d6f0365bc"
]

pattern = re.compile(r'https://images\.unsplash\.com/photo-[a-zA-Z0-9-]+')

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
        
    def repl(match):
        return f"https://images.unsplash.com/photo-{random.choice(gen_alpha_ids)}"
        
    new_content = pattern.sub(repl, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)

for ext in ['content/**/*.mdx', 'components/**/*.tsx', 'app/**/*.tsx']:
    for filepath in glob.glob(ext, recursive=True):
        process_file(filepath)

print("Done replacing images.")
