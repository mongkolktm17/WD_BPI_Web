import sys
import re
import quopri
import os

def convert_mhtml_to_php(mhtml_file_path):
    with open(mhtml_file_path, 'r', encoding='utf-8') as f:
        mhtml_content = f.read()

    boundary_match = re.search(r'boundary="----MultipartBoundary-([\w-]+)"', mhtml_content, re.IGNORECASE)
    if not boundary_match:
        boundary_match = re.search(r'boundary="([^"]+)"', mhtml_content, re.IGNORECASE)
        if not boundary_match:
            print("Error: Could not find boundary string in MHTML file.")
            return
        boundary = boundary_match.group(1)
    else:
        boundary = "----MultipartBoundary-" + boundary_match.group(1)

    parts = mhtml_content.split(boundary)
    html_part = ''
    css_parts = {}

    for part in parts:
        if 'Content-Type: text/html' in part:
            match = re.search(r'Content-Transfer-Encoding: quoted-printable', part, re.IGNORECASE)
            if match:
                html_content_match = re.search(r'<!DOCTYPE html.*', part, re.DOTALL | re.IGNORECASE)
                if html_content_match:
                    html_part = html_content_match.group(0)
                    html_part = quopri.decodestring(html_part).decode('utf-8', 'ignore')

        elif 'Content-Type: text/css' in part:
            cid_match = re.search(r'Content-Location: cid:(.+)', part)
            if cid_match:
                cid = "cid:" + cid_match.group(1).strip()
                css_content_match = re.search(r'(@charset "utf-8";.*)', part, re.DOTALL | re.IGNORECASE)
                if css_content_match:
                    css_content = css_content_match.group(1)
                    css_content = quopri.decodestring(css_content).decode('utf-8', 'ignore')
                    css_parts[cid] = css_content

    if not html_part:
        print("Error: Could not find HTML part in MHTML file.")
        return

    # Embed CSS into HTML
    for cid, css_content in css_parts.items():
        # Use regex to find and replace the link tag
        html_part = re.sub(r'<link[^>]+?href=["|"]'+re.escape(cid)+'["|"][^>]*?>', f'<style>{css_content}</style>', html_part, flags=re.IGNORECASE)

    # Remove any remaining link tags with cid
    html_part = re.sub(r'<link[^>]+?href=["|"]cid:[^>]+?["|"][^>]*?>','', html_part, flags=re.IGNORECASE)

    # Add viewport meta tag if not present
    if '<meta name="viewport"' not in html_part:
        html_part = html_part.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">')

    php_file_path = os.path.splitext(mhtml_file_path)[0] + ".php"
    with open(php_file_path, 'w', encoding='utf-8') as f:
        f.write(html_part)

    print(f"Successfully converted {mhtml_file_path} to {php_file_path}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python converter.py <mhtml_file_path>")
    else:
        convert_mhtml_to_php(sys.argv[1])