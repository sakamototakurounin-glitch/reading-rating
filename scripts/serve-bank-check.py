"""Local-only UI test server. Mock ancillary APIs; never use in production."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import argparse

class Handler(SimpleHTTPRequestHandler):
    grading_calls = 0
    meaning_calls = 0
    root = 'dist'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=Handler.root, **kwargs)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or '{}')
        status = 200
        if self.path == '/api/grade-summary':
            Handler.grading_calls += 1
            if Handler.grading_calls == 1:
                status, data = 503, {'error': 'Intentional test outage'}
            else:
                data = {'elements': [{'name': f'要素{i}', 'score': 1, 'reason': 'UIテスト用'} for i in range(6)], 'impressionScore': 5, 'goodPoints': 'テスト用の評価です', 'missingPoints': 'テスト用', 'improvements': 'テスト用', 'modelSummary': 'これは接続と画面遷移だけを確認するテスト用の採点応答です。'}
        elif self.path == '/api/lookup-words' and body.get('meaningsOnly'):
            Handler.meaning_calls += 1
            if Handler.meaning_calls == 1:
                status, data = 503, {'error': 'Intentional meaning-repair test outage'}
            else:
                short = {'resilience':'回復力','allocation':'配分','transparency':'透明性','sustain':'維持する'}
                data = [{'word': word, 'generalMeaning': short.get(word, '確認'), 'meaningFormat':'short-ja-v2'} for word in body.get('words', [])]
        elif self.path == '/api/lookup-words':
            data = [{'word': word, 'generalMeaning': '確認用の日本語訳', 'meaningFormat':'short-ja-v2', 'exampleSentence': body.get('passage', '').split('.')[0] + '.'} for word in body.get('words', [])]
        elif self.path == '/api/recognize-handwriting':
            data = {'text': 'これは手書きAPI接続確認用の日本語要約です。'}
        else:
            status, data = 410, {'error': 'No generation endpoint is available'}
        content = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4180)
    parser.add_argument('--directory', default='dist')
    args = parser.parse_args()
    Handler.root = args.directory
    print(f'LOCAL MOCK API TEST ONLY: http://127.0.0.1:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
