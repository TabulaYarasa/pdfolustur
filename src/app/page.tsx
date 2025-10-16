'use client';

import { useState } from 'react';
import { TiptapEditor } from '@/components/tiptap-editor';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function Home() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  const generatePDF = async () => {
    // Dinamik import ile html2pdf'i yükle (client-side only)
    const html2pdf = (await import('html2pdf.js')).default;

    // PDF için HTML içeriği oluştur
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.fontSize = '12pt';
    element.style.lineHeight = '1.6';
    element.style.color = '#000';

    // Başlık ekle
    if (title) {
      const titleElement = document.createElement('h1');
      titleElement.style.fontSize = '20pt';
      titleElement.style.fontWeight = 'bold';
      titleElement.style.marginBottom = '20px';
      titleElement.textContent = title;
      element.appendChild(titleElement);
    }

    // İçerik ekle ve stillendirme
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content;

    // Numaralı listeleri düz metne çevir
    const orderedLists = contentDiv.querySelectorAll('ol');
    orderedLists.forEach(ol => {
      const items = ol.querySelectorAll('li');
      const div = document.createElement('div');
      div.style.marginBottom = '10px';

      items.forEach((li, index) => {
        const p = document.createElement('p');
        p.style.margin = '5px 0';
        p.style.paddingLeft = '0';
        p.style.textIndent = '0';
        p.textContent = `${index + 1}. ${li.textContent || ''}`;
        div.appendChild(p);
      });

      ol.replaceWith(div);
    });

    // Madde işaretli listeleri düz metne çevir
    const unorderedLists = contentDiv.querySelectorAll('ul');
    unorderedLists.forEach(ul => {
      const items = ul.querySelectorAll('li');
      const div = document.createElement('div');
      div.style.marginBottom = '10px';

      items.forEach(li => {
        const p = document.createElement('p');
        p.style.margin = '5px 0';
        p.style.paddingLeft = '0';
        p.style.textIndent = '0';
        p.textContent = `• ${li.textContent || ''}`;
        div.appendChild(p);
      });

      ul.replaceWith(div);
    });

    // Stiller ekle
    const style = document.createElement('style');
    style.textContent = `
      @page {
        margin: 15mm;
      }
      body, div {
        font-family: Arial, sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #000;
      }
      p {
        margin: 6px 0;
        padding: 0;
        line-height: 1.6;
      }
      strong {
        font-weight: bold;
      }
      em {
        font-style: italic;
      }
    `;
    element.appendChild(style);
    element.appendChild(contentDiv);

    // PDF ayarları
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: title ? `${title}.pdf` : 'belge.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const
      }
    };

    // PDF oluştur ve indir
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Oluşturucu</h1>
            <p className="text-gray-600">Metninizi yazın ve PDF olarak indirin</p>
          </div>

          {/* Başlık Input */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Belge Başlığı (İsteğe Bağlı)
            </label>
            <input
              id="title"
              type="text"
              placeholder="Başlık girin..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-semibold text-gray-900 placeholder:text-gray-400 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none px-4 py-3 rounded-lg transition-all"
            />
          </div>

          {/* Editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İçerik
            </label>
            <TiptapEditor content={content} onChange={setContent} />
          </div>

          {/* Download Button */}
          <div className="flex justify-end">
            <Button
              onClick={generatePDF}
              size="lg"
              className="gap-2"
              disabled={!content.trim()}
            >
              <Download className="h-5 w-5" />
              PDF İndir
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Tiptap editör ile zengin metin düzenleme, PDF olarak indirme</p>
        </div>
      </div>
    </div>
  );
}
