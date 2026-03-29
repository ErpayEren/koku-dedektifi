(function initKokuShare(global) {
  const APP_URL = 'https://koku-dedektifi.vercel.app';

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function clipped(value, limit) {
    const text = cleanText(value);
    if (!text) return '';
    if (text.length <= limit) return text;
    return `${text.slice(0, Math.max(0, limit - 1)).trim()}...`;
  }

  function buildShareText(payload) {
    const name = cleanText(payload?.name || 'Parfum Sonucu');
    const desc = clipped(payload?.desc || '', 140);
    const family = cleanText(payload?.family || '');
    const intensity = Number(payload?.intensity || 0);
    const intensityText = Number.isFinite(intensity) && intensity > 0 ? `${Math.round(intensity)}% yogunluk` : '';
    const details = [family, intensityText].filter(Boolean).join(' | ');
    const lines = [
      `${name}`,
      desc,
      details,
      'Koku Dedektifi ile analiz edildi',
      APP_URL,
    ].filter(Boolean);
    return lines.join('\n');
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = cleanText(text).split(' ').filter(Boolean);
    if (!words.length) return y;
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = ctx.measureText(candidate).width;
      if (width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);

    const rendered = lines.slice(0, maxLines);
    for (let i = 0; i < rendered.length; i += 1) {
      const isLast = i === maxLines - 1 && lines.length > maxLines;
      const line = isLast ? `${rendered[i].replace(/[.!,;:\-\s]+$/g, '')}...` : rendered[i];
      ctx.fillText(line, x, y + (i * lineHeight));
    }
    return y + (rendered.length * lineHeight);
  }

  async function createShareImageBlob(payload) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#100b19');
    grad.addColorStop(0.55, '#1a1f2f');
    grad.addColorStop(1, '#10262a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(860, 150, 40, 860, 150, 280);
    glow.addColorStop(0, 'rgba(200,169,126,0.42)');
    glow.addColorStop(1, 'rgba(200,169,126,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoundedRect(ctx, 72, 92, 936, 1166, 42);
    ctx.fillStyle = 'rgba(10, 12, 20, 0.78)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,169,126,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const name = clipped(payload?.name || 'Parfum Sonucu', 52);
    const desc = clipped(payload?.desc || '', 260);
    const family = clipped(payload?.family || 'Belirlenmedi', 32);
    const intensity = Number(payload?.intensity || 0);
    const notes = Array.isArray(payload?.notes)
      ? payload.notes.map((note) => clipped(note, 24)).filter(Boolean).slice(0, 4)
      : [];
    const intensityText = Number.isFinite(intensity) && intensity > 0 ? `${Math.round(intensity)} / 100` : 'Belirlenmedi';

    ctx.fillStyle = '#c8a97e';
    ctx.font = '600 36px "Segoe UI", "Arial", sans-serif';
    ctx.fillText('KOKU DEDEKTIFI', 130, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 68px "Segoe UI", "Arial", sans-serif';
    ctx.fillText(name, 130, 290);

    ctx.fillStyle = '#ced7eb';
    ctx.font = '400 34px "Segoe UI", "Arial", sans-serif';
    drawWrappedText(ctx, desc || 'Bu analiz sonucunu arkadaslarinla paylas.', 130, 360, 820, 46, 4);

    ctx.fillStyle = '#8ca2c8';
    ctx.font = '600 28px "Segoe UI", "Arial", sans-serif';
    ctx.fillText('Aile', 130, 610);
    ctx.fillText('Yogunluk', 520, 610);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px "Segoe UI", "Arial", sans-serif';
    ctx.fillText(family, 130, 662);
    ctx.fillText(intensityText, 520, 662);

    if (notes.length > 0) {
      ctx.fillStyle = '#8ca2c8';
      ctx.font = '600 28px "Segoe UI", "Arial", sans-serif';
      ctx.fillText('One Cikan Notalar', 130, 770);

      const badgeY = 810;
      let x = 130;
      for (const note of notes) {
        const w = Math.max(140, Math.ceil(ctx.measureText(note).width + 52));
        if (x + w > 940) break;
        drawRoundedRect(ctx, x, badgeY, w, 58, 20);
        ctx.fillStyle = 'rgba(45, 57, 86, 0.72)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(151, 189, 227, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#dbe7ff';
        ctx.font = '500 25px "Segoe UI", "Arial", sans-serif';
        ctx.fillText(note, x + 24, badgeY + 38);
        x += w + 14;
      }
    }

    ctx.fillStyle = '#c8a97e';
    ctx.font = '600 30px "Segoe UI", "Arial", sans-serif';
    ctx.fillText('koku-dedektifi.vercel.app', 130, 1188);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }

  async function shareResultCard(payload) {
    const text = buildShareText(payload);
    const title = `${cleanText(payload?.name || 'Parfum Sonucu')} - Koku Dedektifi`;
    const url = cleanText(payload?.url || APP_URL);
    const blob = await createShareImageBlob(payload);

    if (blob && navigator.share && navigator.canShare && typeof File !== 'undefined') {
      const file = new File([blob], 'koku-dedektifi-sonuc.jpg', { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title, text, url, files: [file] });
          return { mode: 'webshare-file' };
        } catch (error) {
          if (error?.name === 'AbortError') return { mode: 'cancelled' };
        }
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return { mode: 'webshare-text' };
      } catch (error) {
        if (error?.name === 'AbortError') return { mode: 'cancelled' };
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { mode: 'clipboard' };
      } catch {}
    }

    if (blob) {
      downloadBlob(blob, 'koku-dedektifi-sonuc.jpg');
      return { mode: 'download' };
    }

    return { mode: 'none' };
  }

  global.KokuShare = {
    buildShareText,
    shareResultCard,
  };
})(window);
