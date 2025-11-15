
import re

html_part = '''
<!DOCTYPE html><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" lang="en-us"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><link rel="stylesheet" type="text/css" href="cid:css-4b1120c5-aa8e-4e4e-881f-845e855967a3@mhtml.blink" /><link rel="stylesheet" type="text/css" href="cid:css-8c25e7ea-bc45-4ae4-9abc-c038c81e5b67@mhtml.blink" /><link rel="stylesheet" type="text/css" href="cid:css-4deb809d-2108-47fd-9d05-8fe53cd0d034@mhtml.blink" /><link rel="stylesheet" type="text/css" href="cid:css-b9928040-bc87-4910-bbcb-a09b23217f36@mhtml.blink" /><link rel="stylesheet" type="text/css" href="cid:css-893a2034-2d7f-4c84-81ed-04a5f5159736@mhtml.blink" /><link rel="stylesheet" type="text/css" href="cid:css-ff064e0f-767b-415b-ae4e-d0723ef53b47@mhtml.blink" /><link rel="stylesheet" type="text/css" href="cid:css-4ab762fd-0fa1-426e-b531-807ec3595eb2@mhtml.blink" />
        
        <meta http-equiv="x-ua-compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
    

    <title>รายงานประจำวัน
Building 2</title>
    <link rel="icon" href="https://forms.static.microsoft/images/favicon.ico">
        
    
    
        
        
    
    
    
    
    <link title="Microsoft Forms" rel="alternate" href="https://forms.cloud.microsoft/formapi/api/embed?url=https%3a%2f%2fforms.cloud.microsoft%2fpages%2fresponsepage.aspx%3fid%3depN2o7B0xUGY4WFX7HH6_E_zSBJ3PytAn8qIo-8gpJBUNjNNTFBBUEdWRTFVTkdVVU9DUTRBWlhVTC4u%26origin%3dQRCode%26mobile%3dfalse%26embed%3dtrue" type="application/json+oembed">
    
    <link rel="manifest" href="https://forms.cloud.microsoft/pwa/en-us/app.webmanifest">

<link rel="prefetch" as="script" href="https://forms.static.microsoft/scripts/dists/light-response-page.chunk.lrp_ext.46787e0.js"><link rel="prefetch" as="script" href="https://forms.static.microsoft/scripts/dists/light-response-page.chunk.lrp_saveresponse.95c5dc0.js"><link rel="prefetch" as="script" href="https://forms.static.microsoft/scripts/dists/light-response-page.chunk.lrp_cover.1d0031a.js"><link rel="stylesheet" type="text/css" href="cid:css-4b1120c5-aa8e-4e4e-881f-845e855967a3@mhtml.blink" />
</head>
<body>
</body>
</html>
'''

cid = "cid:css-4b1120c5-aa8e-4e4e-881f-845e855967a3@mhtml.blink"

regex = r'<link[^>]+href="'+re.escape(cid)+r'"[^>]*>'

print(f"Regex: {regex}")

match = re.search(regex, html_part)

if match:
    print(f"Match found: {match.group(0)}")
else:
    print("No match found")

# Try a more lenient regex
regex = r'<link[^>]+href="'+re.escape(cid)+'"[^>]*>'
print(f"Regex: {regex}")
match = re.search(regex, html_part)

if match:
    print(f"Match found: {match.group(0)}")
else:
    print("No match found")
