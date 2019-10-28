const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

function htmlEscape(string) {
    const regex = /[&<>"'\/]/g;

    return String(string).replace(regex, function(match) {
        return entities[match];
    });
}

function isFunction(item) {
    if (typeof item === 'function') {
        return true;
    }

    let type = Object.prototype.toString.call(item);
    return type === '[object Function]' || type === '[object GeneratorFunction]';
}

function toHtml(string) {
    return document.createRange().createContextualFragment(string);
}

// Source: https://github.com/nefe/You-Dont-Need-jQuery#5.3
function event(eventName, data = {}) {
    if (window.CustomEvent) {
        const event = new CustomEvent(eventName, { detail: data });
    } else {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventName, true, true, data);
    }

    return event;
}

class SimpleAjaxForm {
    options = {
        reset: true,
        scrollToMessage: true,
        blurSubmitOnSubmit: true,
        submit: undefined,
        success: undefined,
        failed: undefined,
        complete: undefined,
        messagesContainer: undefined,
        successMessage: 'Submission Successful. Thank you.',
        successMessageClass: 'form-success alert alert-success',
        errorMessageClass: 'form-error alert alert-danger',
    };

    action;
    el;
    form;
    messages;

    constructor(el, action, options) {
        this.options = { ...this.options, ...options };

        if (typeof el === 'string') {
            el = document.querySelector(el);
        }

        if (!el || el instanceof Element === false) {
            throw new Error('SimpleAjaxForm: Invalid target element supplied');
        }

        if (!action) {
            throw new Error('SimpleAjaxForm: Invalid `action` argument supplied');
        }

        this.action = action;

        let form;

        if (el instanceof HTMLFormElement) {
            form = el;
        } else {
            form = el.querySelector('form');
        }

        this.form = form;

        // Where we'll insert messages
        if (this.options.messagesContainer) {
            this.messages =
                this.options.messagesContainer instanceof Element
                    ? this.options.messagesContainer
                    : el.querySelector(this.options.messagesContainer);
        } else {
            this.messages = el.querySelector('.form-messages:not(noscript)');

            if (this.messages.length < 1) {
                this.messages = toHtml('<div class="form-messages></div>');
                this.el.appendChild(this.messages);
            }
        }

        this.registerEvents();
    }

    registerEvents() {
        this.$form.submit(this.handleSubmit);
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.messages.innerHTML = null;

        if (isFunction(this.options.submit)) {
            this.options.submit();
        }

        this.el.dispatchEvent(event('simpleajaxform.submit'));

        let requestOpts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new FormData(this.$form[0]),
        };

        try {
            const response = await fetch(this.action, requestOpts);

            if (response.ok) {
                let body = await response.json();

                body = {
                    ...{ success: true, messages: [] },
                    ...body,
                };

                this.handleSuccess(body);
            } else {
                let body = await response.json();

                if (!body) {
                    body = { success: false, messages: ['An error was encountered'] };
                }

                this.handleError(body);
            }
        } catch (error) {
            this.handleError({
                success: false,
                messages: ['There was an issue communicating with the server'],
            });
        }

        this.handleComplete();
    }

    handleSuccess(responseBody) {
        this.messages.innerHTML = null;

        if (isFunction(this.options.successMessage)) {
            this.options.successMessage(...arguments);
        } else if (this.options.successMessage) {
            this.messages.innerHTML = `<div class="${this.options.successMessageClass}">${this.options.successMessage}</div>`;
        }

        if (isFunction(this.options.success)) {
            this.options.success(...arguments);
        }

        if (this.options.reset) {
            this.form.reset();
        }

        // Scroll to form messages
        if (this.options.scrollToMessage) {
            this.messages.scrollIntoView({ behavior: 'smooth' });
        }

        this.el.dispatchEvent(event('simpleajaxform.success', ...arguments));
    }

    handleError(response) {
        let messages;

        if (response.messages) {
            messages = response.messages;
        } else if (response.errors) {
            messages = response.errors;
        } else {
            messages = responseData;
            delete messages.success;
        }

        this.messages.innerHTML = this.generateErrors(messages);

        if (isFunction(this.options.failed)) {
            this.options.failed(...arguments);
        }

        // Scroll to form messages
        if (this.options.scrollToMessage) {
            this.messages.scrollIntoView({ behavior: 'smooth' });
        }

        this.el.dispatchEvent(event('simpleajaxform.error', arguments));
    }

    handleComplete() {
        if (this.options.blurSubmitOnSubmit) {
            [...this.el.querySelectorAll('[type=submit]')].forEach(el => el.blur());
        }

        if (isFunction(this.options.complete)) {
            this.options.complete();
        }

        this.el.dispatchEvent(event('simpleajaxform.complete'));
    }

    generateErrors(messages) {
        let html = '';

        for (let field in messages) {
            if (messages.hasOwnProperty(field)) {
                if (Array.isArray(messages[field])) {
                    for (let i = 0; i < messages[field].length; i++) {
                        html += `<div class="${this.options.errorMessageClass}">${htmlEscape(
                            messages[field][i]
                        )}</div>`;
                    }
                } else {
                    html += `<div class="${this.options.errorMessageClass}">${htmlEscape(
                        messages[field]
                    )}</div>`;
                }
            }
        }

        return html;
    }
}

export default SimpleAjaxForm;
