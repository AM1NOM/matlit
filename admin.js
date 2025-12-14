// admin.js - simple static admin (no server)
// Data model: an array of question objects:
// { id, exam, year, question, options: [...], answer: 0, explanation, image: "data:image/png;base64,..." }

(function () {
  // DOM refs
  const importJson = document.getElementById('importJson');
  const btnNew = document.getElementById('btnNew');
  const btnExport = document.getElementById('btnExport');
  const btnClear = document.getElementById('btnClear');
  const listEl = document.getElementById('list');

  const editor = document.getElementById('editor');
  const editorTitle = document.getElementById('editorTitle');
  const qForm = document.getElementById('qForm');
  const btnCancel = document.getElementById('btnCancel');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');

  // state
  let questions = [];
  let editingId = null;
  let currentImageData = null; // data URL

  // util
  function elt(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  function download(filename, text) {
    const a = document.createElement('a');
    const blob = new Blob([text], { type: 'application/json' });
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function escapeHtml(str = '') {
    return str.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  // render list
  function renderList() {
    listEl.innerHTML = '';
    if (!questions.length) {
      listEl.innerHTML = '<div class="card">No questions yet</div>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'card';

    questions.forEach(q => {
      const row = document.createElement('div');
      row.className = 'row';
      const left = document.createElement('div');

      left.innerHTML = `<strong>#${q.id}</strong> ${escapeHtml((q.question||'').slice(0,200))}`;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${q.exam || ''} ${q.year || ''}`;
      left.appendChild(meta);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';

      const viewBtn = document.createElement('button');
      viewBtn.className = 'action-small';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => openView(q.id));

      const editBtn = document.createElement('button');
      editBtn.className = 'action-small';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditor(q.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (!confirm('Delete this question?')) return;
        questions = questions.filter(x => x.id !== q.id);
        renderList();
      });

      right.appendChild(viewBtn);
      right.appendChild(editBtn);
      right.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(right);
      wrapper.appendChild(row);
    });

    listEl.appendChild(wrapper);
  }

  // view question (readonly modal-like)
  function openView(id) {
    const q = questions.find(x => x.id === id);
    if (!q) return;
    const win = window.open('', '_blank', 'width=720,height=700,scrollbars=yes');
    const html = `
      <html><head><title>Question #${q.id}</title></head><body style="font-family:system-ui;padding:18px">
      <h2>Question #${q.id}</h2>
      <p><strong>Exam:</strong> ${escapeHtml(q.exam||'')}</p>
      <p><strong>Year:</strong> ${escapeHtml(q.year||'')}</p>
      <p><strong>Question:</strong><br/>${escapeHtml(q.question||'')}</p>
      <p><strong>Options:</strong><br/>${(q.options||[]).map((o,i)=>`<div>${i}. ${escapeHtml(o)}</div>`).join('')}</p>
      <p><strong>Answer:</strong> ${q.answer}</p>
      <p><strong>Explanation:</strong><br/>${escapeHtml(q.explanation||'')}</p>
      ${q.image? `<p><strong>Image:</strong><br/><img src="${q.image}" style="max-width:420px;max-height:420px"/></p>` : ''}
      </body></html>
    `;
    win.document.write(html);
    win.document.close();
  }

  // editor
  function openEditor(id = null) {
    editingId = id;
    editor.hidden = false;
    editorTitle.textContent = id ? `Edit #${id}` : 'New question';

    if (id) {
      const q = questions.find(x => x.id === id);
      if (!q) return;
      qForm.elements['exam'].value = q.exam || '';
      qForm.elements['year'].value = q.year || '';
      qForm.elements['question'].value = q.question || '';
      qForm.elements['options'].value = (q.options || []).join('\n');
      qForm.elements['answer'].value = q.answer ?? 0;
      qForm.elements['explanation'].value = q.explanation || '';
      currentImageData = q.image || null;
    } else {
      qForm.reset();
      qForm.elements['answer'].value = 0;
      currentImageData = null;
    }
    renderImagePreview();
    scrollTo(editor);
  }

  function closeEditor() {
    editingId = null;
    editor.hidden = true;
    qForm.reset();
    currentImageData = null;
    renderImagePreview();
  }

  // save
  qForm.addEventListener('submit', function (ev) {
    ev.preventDefault();

    const exam = qForm.elements['exam'].value.trim();
    const year = qForm.elements['year'].value ? Number(qForm.elements['year'].value) : null;
    const questionText = qForm.elements['question'].value.trim();
    const options = qForm.elements['options'].value.split('\n').map(s => s.trim()).filter(Boolean);
    const answer = Number(qForm.elements['answer'].value);
    const explanation = qForm.elements['explanation'].value.trim();

    if (!questionText || options.length < 2) {
      alert('Please enter a question and at least two options.');
      return;
    }
    if (answer < 0 || answer >= options.length) {
      if (!confirm('Answer index is outside options range. Save anyway?')) return;
    }

    if (editingId) {
      const idx = questions.findIndex(x => x.id === editingId);
      if (idx === -1) return;
      questions[idx] = {
        id: editingId,
        exam, year, question: questionText,
        options, answer, explanation,
        image: currentImageData || null
      };
    } else {
      const newId = Date.now(); // simple unique id
      questions.unshift({
        id: newId,
        exam, year, question: questionText,
        options, answer, explanation,
        image: currentImageData || null
      });
    }
    closeEditor();
    renderList();
  });

  btnCancel.addEventListener('click', () => closeEditor());

  // image input
  imageInput.addEventListener('change', function () {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      currentImageData = e.target.result; // data URL
      renderImagePreview();
    };
    reader.readAsDataURL(file);
  });

  function renderImagePreview() {
    imagePreview.innerHTML = '';
    if (currentImageData) {
      const img = document.createElement('img');
      img.src = currentImageData;
      imagePreview.appendChild(img);
    }
  }

  // import JSON
  importJson.addEventListener('change', function () {
    const f = importJson.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) {
          // maybe wrapped object {pages:..., file:...} or {questions: [...]}
          if (parsed.questions && Array.isArray(parsed.questions)) {
            questions = parsed.questions;
          } else {
            alert('JSON must be an array of questions or an object with a "questions" array.');
            return;
          }
        } else {
          questions = parsed;
        }
        // repair minimal sanity: ensure ids exist
        questions = questions.map(q => ({
          id: q.id ?? Date.now() + Math.floor(Math.random()*100000),
          exam: q.exam ?? '',
          year: q.year ?? null,
          question: q.question ?? '',
          options: q.options ?? [],
          answer: q.answer ?? 0,
          explanation: q.explanation ?? '',
          image: q.image ?? null
        }));
        renderList();
        alert('Imported ' + questions.length + ' questions.');
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
      }
    };
    reader.readAsText(f);
    importJson.value = '';
  });

  // export JSON
  btnExport.addEventListener('click', function () {
    if (!questions.length) {
      if (!confirm('No questions — export empty list?')) return;
    }
    const pretty = JSON.stringify(questions, null, 2);
    download('questions.json', pretty);
  });

  // new
  btnNew.addEventListener('click', () => openEditor(null));

  // clear
  btnClear.addEventListener('click', () => {
    if (!confirm('Clear all questions from the editor (this does not delete any files on disk)?')) return;
    questions = [];
    renderList();
  });

  // helper to scroll
  function scrollTo(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // open editor for id
  function openEditorById(id) {
    openEditor(id);
  }
  // expose openEditor to buttons in list
  window.openEditor = openEditorById;

  // initial render
  renderList();
})();
