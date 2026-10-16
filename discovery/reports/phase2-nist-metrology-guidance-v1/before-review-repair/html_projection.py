"""Bounded static public-HTML text projection; no external resolution or execution."""
from html.parser import HTMLParser
import re

MAX_BYTES = 1024 * 1024
MAX_TAGS = 100000
MAX_DEPTH = 256
MAX_BLOCKS = 20000
SKIP = {'script', 'style', 'noscript', 'svg', 'template'}
BLOCKS = {'h1','h2','h3','h4','h5','h6','p','li','caption','pre','td','th'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Blocked(Exception):
    pass

class Projection(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = 0
        self.stack = []
        self.blocks = []
        self.active = []
        self.title = []
        self.title_open = False
    def handle_starttag(self, tag, attrs):
        self.tags += 1
        if self.tags > MAX_TAGS or len(self.stack) >= MAX_DEPTH:
            raise Blocked('HTML_COMPLEXITY')
        if tag not in VOID:
            self.stack.append(tag)
        if tag in BLOCKS and not any(x in SKIP for x in self.stack):
            self.active.append({'tag':tag,'depth':len(self.stack),'line':self.getpos()[0],'parts':[]})
        if tag == 'title':self.title_open=True
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self, tag):
        if tag == 'title':self.title_open=False
        if tag in self.stack:
            depth=len(self.stack)-self.stack[::-1].index(tag)
            while self.active and self.active[-1]['depth'] >= depth:
                block=self.active.pop()
                text=re.sub(r'\s+',' ',''.join(block.pop('parts'))).strip()
                if text:
                    block['text']=text
                    self.blocks.append(block)
                    if len(self.blocks)>MAX_BLOCKS:raise Blocked('HTML_BLOCK_LIMIT')
            del self.stack[depth-1:]
    def handle_data(self,data):
        if any(x in SKIP for x in self.stack):return
        if self.title_open:self.title.append(data)
        for block in self.active:block['parts'].append(data)
    def finish(self):
        self.close()
        while self.stack:self.handle_endtag(self.stack[-1])
        return {'title':re.sub(r'\s+',' ',''.join(self.title)).strip(),'blocks':self.blocks,'parsed_start_tags':self.tags,'text_whitespace_normalized':True,'scope':'Static text blocks only. No scripts, CSS, linked images/PDFs, external entities or dynamic rendering are executed or requested; equations carried only by images may be absent.'}

def project(raw):
    if type(raw) is not bytes or not 0<len(raw)<=MAX_BYTES:raise Blocked('BODY_SIZE')
    text=raw.decode('utf-8-sig',errors='strict')
    if '\x00' in text:raise Blocked('TEXT_ENCODING')
    parser=Projection();parser.feed(text);return parser.finish()
