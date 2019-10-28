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

        this.registerEvent();
    }

    registerEvent() {
        this.$form.submit(this.handleSubmit);
    }

    handleSubmit(event) {
        event.preventDefault();
        this.$messages.empty();

        let requestOpts = {
            type: 'POST',
            url: this.action,
            dataType: 'json',
            success: this.handleSuccess,
            error: this.handleError,
            complete: this.handleComplete,
        };

        requestOpts.data = new FormData(this.$form[0]);
        requestOpts.processData = false;
        requestOpts.contentType = false;

        $.ajax(requestOpts);

        if ($.isFunction(this.options.submit)) {
            this.options.submit();
        }

        this.$el.trigger('simpleajaxform.submit');
    }

    handleSuccess(responseBody, status, error) {
        let eventArgs = [...arguments];

        this.$messages.empty();

        if ($.isFunction(this.options.successMessage)) {
            this.options.successMessage(...eventArgs);
        }
        else if (this.options.successMessage) {
            this.$messages.append('<div class="' + this.options.successMessageClass + '">' + this.options.successMessage + '</div>');
        }

        if ($.isFunction(this.options.success)) {
            this.options.success(...eventArgs);
        }

        if (this.options.reset) {
            this.$form[0].reset();
        }

        // Scroll to form messages
        if (this.options.scrollToMessage) {
            this.$scrollTarget.animate({scrollTop: this.$messages.offset().top - this.scrollTopBuffer});
        }

        this.$el.trigger('simpleajaxform.success', eventArgs);
    }

    handleError(responseBody, status, error) {
        // Convert arguments to array
        let eventArgs = [...arguments];

        let response = responseBody.responseJSON || {success: false, messages: ['An error was encountered']};

        let responseData = JSON.parse(JSON.stringify(response));
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

        if ($.isFunction(this.options.failed)) {
            this.options.failed(...eventArgs);
        }

        // Scroll to form messages
        if (this.options.scrollToMessage) {
            this.$scrollTarget.animate({scrollTop: this.$messages.offset().top - this.scrollTopBuffer});
        }

        this.$el.trigger('simpleajaxform.error', eventArgs);
    }

    handleComplete(responseBody, status, error) {
        let eventArgs = [...arguments];

        if (this.options.blurSubmitOnSubmit) {
            this.$el.find('[type=submit]').blur();
        }

        if ($.isFunction(this.options.complete)) {
            this.options.complete(...eventArgs);
        }

        this.$el.trigger('simpleajaxform.complete', eventArgs);
    }

    generateErrors(messages) {
        let html = '';

        for (let field in messages) {
            if (messages.hasOwnProperty(field)) {
                if ($.isArray(messages[field])) {
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
