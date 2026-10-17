"""Checks for build.py. Run from anywhere:  python3 tests/test_build.py

Each test works on a temporary copy of the script, chapters and story page,
so the real files are never touched.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'fiction/unbinding/index.html'


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        shutil.copy(os.path.join(REPO, 'build.py'), self.tmp)
        shutil.copytree(os.path.join(REPO, 'chapters'), os.path.join(self.tmp, 'chapters'))
        os.makedirs(os.path.join(self.tmp, 'fiction/unbinding'))
        shutil.copy(os.path.join(REPO, PAGE), os.path.join(self.tmp, PAGE))

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def page(self):
        with open(os.path.join(self.tmp, PAGE), 'rb') as f:
            return f.read()

    def set_page(self, data):
        with open(os.path.join(self.tmp, PAGE), 'wb') as f:
            f.write(data)

    def build(self):
        # Run from a different folder to check the script finds its own files.
        return subprocess.run([sys.executable, os.path.join(self.tmp, 'build.py')],
                              cwd=tempfile.gettempdir(), capture_output=True, text=True)

    def test_normal_build_is_unchanged_and_leaves_no_temp_files(self):
        before = self.page()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.page(), before)
        self.assertEqual(sorted(os.listdir(os.path.join(self.tmp, 'fiction/unbinding'))), ['index.html'])

    def test_missing_chapter_file_fails(self):
        os.remove(os.path.join(self.tmp, 'chapters/05-lily-does-not-answer.md'))
        before = self.page()
        result = self.build()
        self.assertEqual(result.returncode, 1)
        self.assertIn('05-lily-does-not-answer.md', result.stderr)
        self.assertEqual(self.page(), before)

    def test_missing_slot_fails(self):
        slot = b'<div class="prose" data-chapter="4">'
        self.set_page(self.page().replace(slot, b'<div class="prose">'))
        before = self.page()
        result = self.build()
        self.assertEqual(result.returncode, 1)
        self.assertIn('05-lily-does-not-answer', result.stderr)
        self.assertIn('found 0', result.stderr)
        self.assertEqual(self.page(), before)

    def test_duplicate_slot_fails(self):
        slot = b'<div class="prose" data-chapter="2">'
        self.set_page(self.page().replace(slot, slot + b'</div>' + slot, 1))
        before = self.page()
        result = self.build()
        self.assertEqual(result.returncode, 1)
        self.assertIn('03-james-in-the-parking-lot', result.stderr)
        self.assertIn('found 2', result.stderr)
        self.assertEqual(self.page(), before)


if __name__ == '__main__':
    unittest.main()
