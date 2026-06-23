const escapeHtml = (value) => {
    if (value == null || value === '') return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

const formatDuration = (seconds) => {
    if (seconds == null || seconds === '') return null;
    const total = Number(seconds);
    if (Number.isNaN(total)) return String(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatChatTime = (time, fallback) => {
    const date = time ? new Date(time) : fallback ? new Date(fallback) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatLocation = ({ state, country, zipCode }) => {
    return [state, country, zipCode].filter(Boolean).join(', ') || null;
};

const buildChatTranscriptHtml = (chatTranscript) => {
    if (!chatTranscript?.trim()) {
        return '';
    }

    const parsed = chatTranscript.split('\n').reduce((acc, line, index, array) => {
        const datePattern = /\(\w{3}, \d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2}\)/;
        const namePattern = /^[A-Za-z0-9]+:/;
        let name, message;

        if (datePattern.test(line) || namePattern.test(line)) {
            const parts = line.split(/: (.+)/);
            if (parts.length > 1 && datePattern.test(parts[1])) {
                const subParts = parts[1].split(') ');
                name = parts[0];
                message = subParts[1] || '';

                if (!message && array[index + 1] && !datePattern.test(array[index + 1]) && !namePattern.test(array[index + 1])) {
                    message = array[index + 1].trim();
                    array[index + 1] = '';
                }

                acc.push({ name: `${name} ${subParts[0]})`, message: message.trim() });
            } else {
                name = parts[0];
                message = parts[1] || '';

                if (!message && array[index + 1] && !datePattern.test(array[index + 1]) && !namePattern.test(array[index + 1])) {
                    message = array[index + 1].trim();
                    array[index + 1] = '';
                }

                acc.push({ name, message: message.trim() });
            }
        } else if (acc.length > 0 && line.trim() !== '') {
            acc[acc.length - 1].message += ' ' + line.trim();
        } else if (acc.length === 0 && line.trim() !== '') {
            acc.push({ name: '', message: line.trim() });
        }

        return acc;
    }, []);

    const htmlRows = parsed.map((item) => {
        if (item.name === '' && item.message) {
            const parts = item.message.split(/(?<=\))/);
            if (parts.length > 1) {
                item.name = parts[0].trim();
                item.message = parts[1].trim();
            }
        }

        const displayName = item.name.replace(/:$/, '');
        const nameCell = displayName
            ? `<strong>${escapeHtml(displayName)}:</strong>`
            : '';

        return `<tr><td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;">${nameCell}</td><td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">${escapeHtml(item.message)}</td></tr>`;
    }).join('');

    if (parsed.length === 1 && !parsed[0].name?.trim()) {
        return `<tr><td colspan="2" style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px; color: #fff;">${escapeHtml(parsed[0].message.trim())}</td></tr>`;
    }

    if (htmlRows.trim()) {
        return htmlRows;
    }

    return `<tr><td colspan="2" style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px; color: #fff;">${escapeHtml(chatTranscript.trim())}</td></tr>`;
};

const displayOrNa = (value) => (value != null && value !== '' ? value : 'NA');

module.exports = {
    escapeHtml,
    formatDuration,
    formatChatTime,
    formatLocation,
    buildChatTranscriptHtml,
    displayOrNa,
};
