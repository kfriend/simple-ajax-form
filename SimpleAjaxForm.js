import $ from jQuery;

const global = window;

const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
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
    $form;
    $messages;
    scrollTopBuffer = 50;
    $scrollTarget;

    constructor(el, action, options) {
        this.options = {...this.options, ...options};

        // Make sure a jQuery instance was passed, and that we're dealing with
        // just one element.
        el = (el instanceof $) ? el.first() : $(el).first();

        this.$el = el;

        if (!action) {
            throw new Error('SimpleAjaxForm: Invalid `action` argument supplied');
        }

        this.action = action;

        // Set the form to el, if it happens to be a <form>, or the first child <form>
        this.$form = el.is('form') ? el : el.find('form').first();

        // Where we'll insert messages
        if (this.options.messagesContainer) {
            this.$messages = (typeof this.option.messagesContainer === 'jQuery')
                ? this.options.messagesContainer
                : $(this.options.messagesContainer);
        } else {
            this.$messages = el.find('.form-messages').not('noscript').first();

            if (this.$messages.length < 1) {
                this.$messages = $('<div />').addClass('form-messages');
                this.$el.prepend(this.$messages);
            }
        }

        this.registerEvents();
    }

    registerEvents() {
        this.$form.submit(this.handleSubmit);
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.$messages.empty();

        if (isFunction(this.options.submit)) {
            this.options.submit();
        }

        this.$el.trigger('simpleajaxform.submit');

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
                    ...{success: true, messages: []},
                    ...body
                }

                this.handleSuccess(body);
            } else {
                let body = await response.json();

                if (!body) {
                    body = {success: false, messages: ['An error was encountered']};
                }

                this.handleError(body);
            }
        } catch (error) {
            this.handleError({
                success: false,
                messages: [
                    'There was an issue communicating with the server',
                ]
            });
        }

        this.handleComplete();
    }

    handleSuccess(responseBody) {
        this.$messages.empty();

        if (isFunction(this.options.successMessage)) {
            this.options.successMessage(...arguments);
        }
        else if (this.options.successMessage) {
            this.$messages.append('<div class="' + this.options.successMessageClass + '">' + this.options.successMessage + '</div>');
        }

        if (isFunction(this.options.success)) {
            this.options.success(...arguments);
        }

        if (this.options.reset) {
            this.$form[0].reset();
        }

        // Scroll to form messages
        if (this.options.scrollToMessage) {
            this.$scrollTarget.animate({scrollTop: this.$messages.offset().top - this.scrollTopBuffer});
        }

        this.$el.trigger('simpleajaxform.success', ...arguments);
    }

    handleError(response) {
        let messages;

        if (response.messages) {
            messages = response.messages;
        }
        else if (response.errors) {
            messages = response.errors;
        }
        else {
            messages = responseData;
            delete messages.success;
        }

        this.$messages.append(this.generateErrors(messages));

        if (isFunction(this.options.failed)) {
            this.options.failed(...arguments);
        }

        // Scroll to form messages
        if (this.options.scrollToMessage) {
            this.$scrollTarget.animate({scrollTop: this.$messages.offset().top - this.scrollTopBuffer});
        }

        this.$el.trigger('simpleajaxform.error', arguments);
    }

    handleComplete() {
        if (this.options.blurSubmitOnSubmit) {
            this.$el.find('[type=submit]').blur();
        }

        if (isFunction(this.options.complete)) {
            this.options.complete();
        }

        this.$el.trigger('simpleajaxform.complete');
    }

    generateErrors(messages) {
        let html = '';

        for (let field in messages) {
            if (messages.hasOwnProperty(field)) {
                if (Array.isArray(messages[field])) {
                    for (let i = 0; i < messages[field].length; i++) {
                        html += '<div class="' + this.options.errorMessageClass+ '">' + htmlEscape(messages[field][i]) + '</div>';
                    }
                }
                else {
                    html += '<div class="' + this.options.errorMessageClass+ '">' + htmlEscape(messages[field]) + '</div>';
                }
            }
        }

        return html;
    }
}

export default SimpleAjaxForm;
