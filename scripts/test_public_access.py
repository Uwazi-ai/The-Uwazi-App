"""Read-only access regression tests. Never prints credentials or signed URLs."""
import unittest
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
CONFIG = {}
for line in (ROOT / '.env').read_text().splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        CONFIG[key] = value.strip().strip('"').strip("'")
URL = CONFIG['VITE_SUPABASE_URL']
KEY = CONFIG.get('VITE_SUPABASE_PUBLISHABLE_KEY') or CONFIG.get('VITE_SUPABASE_ANON_KEY')
HEADERS = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY}

class PublicAccessTests(unittest.TestCase):
    def test_unapproved_personas_are_not_public(self):
        response = requests.get(URL + '/rest/v1/compass_personas', headers=HEADERS,
                                params={'select': 'slug', 'is_public': 'eq.false'}, timeout=20)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_current_public_personas_remain_available(self):
        response = requests.get(URL + '/rest/v1/compass_personas', headers=HEADERS,
                                params={'select': 'slug'}, timeout=20)
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row['slug'] for row in response.json()},
                         {'watchdog', 'builder', 'guardian', 'neighbor', 'mentor',
                          'caretaker', 'connector', 'organizer', 'steward'})

    def test_unknown_poster_is_denied(self):
        response = requests.post(URL + '/rest/v1/rpc/is_public_episode_poster', headers=HEADERS,
                                 json={'_name': 'episode-posters/00000000-0000-0000-0000-000000000000.jpg'}, timeout=20)
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json(), False)

    def test_unlisted_clip_is_denied(self):
        response = requests.post(URL + '/rest/v1/rpc/is_public_clip_media', headers=HEADERS,
                                 json={'_name': 'unlisted-private-original.mp4'}, timeout=20)
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.json(), False)

if __name__ == '__main__':
    unittest.main()