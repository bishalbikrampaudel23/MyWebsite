(function () {
  var form = document.getElementById('query-form');
  if (!form) {
    return;
  }

  var status = document.getElementById('query-status');
  var submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    var values = new FormData(form);
    submitButton.disabled = true;
    status.textContent = 'Sending your private query…';

    try {
      var response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          email: values.get('email'),
          subject: values.get('subject'),
          message: values.get('message'),
          website: values.get('website')
        })
      });
      var result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Your query could not be sent. Please try again.');
      }

      form.reset();
      status.textContent = result.notificationSent === false
        ? 'Your query was saved, but the inbox email alert could not be sent. Please use the contact details below if your message is urgent.'
        : 'Your query has been sent privately. Thank you — I’ll reply to your email.';
    } catch (error) {
      status.textContent = error.message || 'Your query could not be sent. Please try again.';
    } finally {
      submitButton.disabled = false;
    }
  });
})();
