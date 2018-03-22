var _, emailer, fs;

emailer = require('nodemailer');

fs = require('fs');

_ = require('underscore');

module.exports = function(env) {
  var Mailer, config;
  config = env.config;
  Mailer = (function() {
    Mailer.prototype.options = {};

    Mailer.prototype.data = {};

    function Mailer(options, data1) {
      this.options = options;
      this.data = data1;
    }

    Mailer.prototype.send = function(callback) {
      var html, message, transport;
      if ((this.options.templateName != null) && this.options.templatePath) {
        html = this.getHtml(this.options.templateName, this.data);
      }
      message = {
        to: "" + this.options.to.email,
        from: "" + this.options.from.email,
        subject: this.options.subject,
        text: html == null ? this.options.body : void 0,
        html: html != null ? html : void 0,
        generateTextFromHTML: html != null ? true : void 0
      };
      transport = this.getTransport();
      return transport.sendMail(message, callback);
    };

    Mailer.prototype.getTransport = function() {
      return emailer.createTransport("SMTP", config.smtp);
    };

    Mailer.prototype.getHtml = function(templateName, data) {
      var encoding, template, templateContent, templateFullPath;
      templateFullPath = this.options.templatePath + "/" + templateName + ".html";
      templateContent = fs.readFileSync(templateFullPath, encoding = "utf8");
      template = _.template(templateContent, {
        interpolate: /\{\{(.+?)\}\}/g
      });
      return template(data);
    };

    return Mailer;

  })();
  return Mailer;
};
