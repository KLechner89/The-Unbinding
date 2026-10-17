import contextlib, importlib.util, io, shutil, tempfile, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
class BuildTests(unittest.TestCase):
 def setUp(self):
  self.temp = tempfile.TemporaryDirectory()
  self.root = Path(self.temp.name)
  shutil.copy(ROOT / 'index.html', self.root)
  shutil.copytree(ROOT / 'chapters', self.root / 'chapters')
  builder.ROOT = self.root
 def tearDown(self): self.temp.cleanup()
 def build(self):
  with contextlib.redirect_stdout(io.StringIO()): builder.build()
 def test_link_survives_repeated_build(self):
  self.build()
  first = (self.root / 'index.html').read_text()
  self.assertTrue('If this moved you, you can tell me.' in first)
  self.build()
  self.assertEqual(first, (self.root / 'index.html').read_text())
 def test_missing_or_duplicate_container_does_not_write(self):
  target = self.root / 'index.html'
  original = target.read_text()
  for replacement in ['', '<div class="prose" data-chapter="0"></div><div class="prose" data-chapter="0">']:
   broken = original.replace('<div class="prose" data-chapter="0">', replacement)
   target.write_text(broken)
   with self.assertRaises(ValueError): self.build()
   self.assertEqual(broken, target.read_text())
 def test_missing_chapter_does_not_write(self):
  target = self.root / 'index.html'
  before = target.read_bytes()
  next((self.root / 'chapters').glob('11-*.md')).unlink()
  with self.assertRaises(ValueError): self.build()
  self.assertEqual(before, target.read_bytes())
 def test_literal_prose(self):
  next((self.root / 'chapters').glob('01-*.md')).write_text('# Chapter\n\n<em>Literal</em> & \\1')
  self.build()
  self.assertIn('&lt;em&gt;Literal&lt;/em&gt; &amp; \\1', (self.root / 'index.html').read_text())
 def test_only_first_heading_line_is_removed(self):
  self.assertEqual(builder.md_to_html('# Chapter\n\n# Keep this text'), '<p class="first"># Keep this text</p>')
  self.assertEqual(builder.md_to_html('Opening\n\n# Keep this too'), '<p class="first">Opening</p>\n<p># Keep this too</p>')
if __name__ == '__main__': unittest.main()
