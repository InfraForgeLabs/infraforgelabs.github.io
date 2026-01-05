export function renderReplies(replies, attachments) {
  const byReply = {};

  for (const att of attachments) {
    if (!byReply[att.reply_id]) byReply[att.reply_id] = [];
    byReply[att.reply_id].push(att);
  }

  return replies.map(r => {
    const imgs = (byReply[r.id] || [])
      .filter(a => a.mime_type.startsWith("image/"))
      .map(a => `<img src="${a.public_url}" class="reply-image">`)
      .join("");

    return `
      <div class="reply">
        <div class="meta">
          <strong>${r.author_email}</strong>
          <span>${r.created_at}</span>
        </div>
        <div class="body">${escapeHtml(r.body)}</div>
        ${imgs}
      </div>
    `;
  }).join("");
}
