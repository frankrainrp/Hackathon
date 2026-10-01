from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import zipfile
from pypdf import PdfWriter
from pypdf.generic import NameObject, DictionaryObject, DecodedStreamObject
from course_content import extract_material, extract_bytes, MAX_TEXT


def synthetic_pdf():
    writer = PdfWriter()
    page = writer.add_blank_page(width=200, height=200)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
    stream = DecodedStreamObject()
    stream.set_data(b'BT /F1 12 Tf 10 100 Td (Willow: 37 successes in 50 trials. Rate 74%.) Tj ET')
    page[NameObject('/Contents')] = writer._add_object(stream)
    result = BytesIO()
    writer.write(result)
    return result.getvalue()


def synthetic_office(extension):
    result = BytesIO()
    with zipfile.ZipFile(result, 'w') as archive:
        if extension == 'pptx':
            archive.writestr('ppt/slides/slide2.xml', '<slide><t>Second lesson</t></slide>')
            archive.writestr('ppt/slides/slide1.xml', '<slide><t>Willow succeeds 37 of 50 times; 74%.</t></slide>')
        else:
            archive.writestr('word/document.xml', '<document><t>Willow succeeds 37 of 50 times; 74%.</t></document>')
    return result.getvalue()


class CourseContentTests(unittest.TestCase):
    def test_pdf_and_office_read_real_body_text(self):
        for ext, data in [('pdf', synthetic_pdf()), ('pptx', synthetic_office('pptx')), ('docx', synthetic_office('docx'))]:
            with self.subTest(format=ext), TemporaryDirectory() as folder:
                path = Path(folder) / ('lesson.' + ext)
                path.write_bytes(data)
                result = extract_material(path)
                self.assertEqual(result['textStatus'], 'ready')
                self.assertIn('74%', result['text'])
                if ext == 'pptx':
                    self.assertLess(result['text'].index('Willow'), result['text'].index('Second lesson'))

    def test_archive_stays_in_memory_and_ignores_traversal(self):
        data = BytesIO()
        with zipfile.ZipFile(data, 'w') as archive:
            archive.writestr('../private.txt', 'must not appear')
            archive.writestr('notes.html', '<h1>Readable lesson</h1><script>must not appear</script>')
            archive.writestr('slides.pptx', synthetic_office('pptx'))
        text = extract_bytes('lesson.zip', data.getvalue())
        self.assertIn('Readable lesson', text)
        self.assertIn('74%', text)
        self.assertNotIn('must not appear', text)

    def test_scan_and_long_text_are_not_misrepresented(self):
        with TemporaryDirectory() as folder:
            writer = PdfWriter()
            writer.add_blank_page(width=200, height=200)
            path = Path(folder) / 'scan.pdf'
            writer.write(path)
            self.assertEqual(extract_material(path)['textStatus'], 'empty')
            path = Path(folder) / 'long.md'
            path.write_text('a' * (MAX_TEXT + 500), encoding='utf-8')
            result = extract_material(path)
            self.assertEqual(result['textStatus'], 'truncated')
            self.assertEqual(len(result['text']), MAX_TEXT)


if __name__ == '__main__':
    unittest.main()
