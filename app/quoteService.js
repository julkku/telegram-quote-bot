var db = require('./quotes');
var TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
var bot = new TelegramBot(process.env.API_TOKEN, { polling: true });
var config = require('../config');


function start(msg) {
    var chatId = msg.chat.id;

    db.Group.findOne({ chatId: chatId }, function (err, group) {
        if (!group) {

            quoteService.addGroup(chatId);
            return;
        }

        bot.sendMessage(msg.chat.id, "Group already exists! :)");
    });

}

function sleep(msg) {
    var chatId = msg.chat.id;

    db.Group.findOne({ chatId: chatId }, function (err, arr) {
        var d = new Date();
        if (d.getTime() - arr.lastQuote < config.spamSec * 1000) {
            console.log("Already asleep! Time left: " + (-(d.getTime() - arr.lastQuote) / 1000));
            return;
        }
        arr.lastQuote = d.getTime() + config.sleepTime * 1000;
        arr.save(function (err) {
            if (err) throw err;
            console.log("sleeping for 200 seconds");
            bot.sendMessage(msg.chat.id, "ok, ,___, ");

        });
    });

}

function quote(msg, match) {
    var chatId = msg.chat.id;

    db.Group.findOne({ chatId: chatId }, function (err, arr) {


        var d = new Date();
        if (d.getTime() - arr.lastQuote < config.spamSec * 1000) {
            console.log("Blocked for spam! Time left: " + (-(d.getTime() - arr.lastQuote) / 1000));
            return;
            // if (arr.lastRequestBy == msg.from.id && msg.chat.type != 'private') {
            //     console.log("blocked for spam from person");
            //     return;
            // }
        }

        if (match[4] == undefined) {
            if (Math.random() < 0.005) {
                sentTotallyRandom(msg);
                return;
            }
            getQuoteForGroup(msg, arr._id, '.');
        } else {
            console.log("searching for: " + match[4]);
            getQuoteForGroup(msg, arr._id, match[4]);
        }

        arr.lastQuote = d.getTime();
        arr.lastRequestBy = msg.from.id;
        arr.save(function (err) {
            if (err) throw err;
            // console.log('!');
        });
    });

}

function imfeelinglucky(msg) {
    var chatId = msg.chat.id;

    db.Group.findOne({ chatId: chatId }, function (err, arr) {


        var d = new Date();
        if (d.getTime() - arr.lastQuote < 10000) {
            console.log("Blocked for spam! Time left: " + (-(d.getTime() - arr.lastQuote) / 1000));
            return;
            // if (arr.lastRequestBy == msg.from.id && msg.chat.type != 'private') {
            //     console.log("blocked for spam from person");
            //     return;
            // }
        }
        sentTotallyRandom(msg);

        arr.lastQuote = d.getTime();
        arr.lastRequestBy = msg.from.id;
        arr.save(function (err) {
            if (err) throw err;
            // console.log('!');
        });
    });

}

function add(msg, match) {
    console.log(msg)
    var chatId = msg.chat.id;

    if (msg.reply_to_message) {
        if (msg.reply_to_message.text) {
            addToGroup(msg.from.id, msg, msg.reply_to_message.text);
            return;
        }

        if (msg.reply_to_message.sticker) {
            var syntax = "sti!:" + msg.reply_to_message.sticker.file_id;
            if (match[4]) {
                syntax += "(" + match[4] + " )";
            }
            addToGroup(msg.from.id, msg, syntax);
            return;
        }
    }

    if (match[4] == undefined) {
        return;
    }

    addToGroup(msg.from.id, msg, match[4]);

}

function voteCallback(callbackQuery) {
    //this seems to be missing a row or two... i'll have to find it...
    if (parts[0] == '+' || parts[0] == '-') {
        db.Quote.findById(parts[1], function (err, quote) {
            if (quote) {
                if (quote.rating) var rating = quote.rating;
                if (parts[0] == '+') rating++;
                if (parts[0] == '-') rating--;
                quote.rating = rating;

                quote.save(function (err, quote) {
                    if (err) throw err;

                    console.log(quote);
                });
                bot.answerCallbackQuery(callbackQuery.id, "new rating: " + rating);
            }
        });


    }
    var options = {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id
    };
    bot.editMessageText(callbackQuery.message.text, options);


}

function addGroup(chatId) {

    // console.log(msg);

    var newGroup = db.Group({
        chatId: chatId,
        lastQuote: 0
    });
    newGroup.save(function (err) {
        if (err) throw err;
        bot.sendMessage(chatId, "Group or user added! :)");

    });
}

function addToGroup(addedBy, msg, toAdd) {
    var chatId = msg.chat.id;

    var groupId = 0;
    var quoteId = 0;

    db.Group.findOne({ chatId: chatId }, function (err, group) {
        if (!group) {
            return;
        }
        groupId = group._id;

        var newQuote = db.Quote({
            quote: toAdd,
            addedBy: addedBy,
            group: groupId
        });

        newQuote.save(function (err, quote) {
            if (quote) {
                // quoteId = quote._id;
                // bot.sendMessage(chatId, "Saved quote: " + quote.quote, quote._id);
                sendToChat(msg, "Saved quote: " + quote.quote, quote._id);
            } else {
                console.log(err);
                bot.sendMessage(chatId, "lol no");

            }
        });
    })


}


function escape(text) {
    return text.replace(/[-[\]{}()*+?,\\^$|#\s]/g, "\\$&");
}

function getQuoteForGroup(msg, group_id, search) {
    var chatId = msg.chat.id;
    console.log(msg)

    var re = new RegExp(escape(search.trim()), "i");
    console.log("regex ", re);

    db.Quote.findRandom({ group: group_id, quote: re }, function (err, quote) {
        // console.log(quote);
        if (quote[0]) {
            sendToChat(msg, quote[0].quote, quote[0]._id);
            // bot.sendMessage(chatId, quote[0].quote);
        } else {
            getQuoteForGroup(msg, group_id, '.');
        }
    });
}

function sendToChat(msg, message, quoteId) {
    var chatId = msg.chat.id;
    console.log(message.substr(0, 5), message.substr(5, 31), message.substr(36));
    if (message.length > 7 && message.substr(0, 5) == 'sti!:') {
        var stickerId = message.split(':')[1].split('(')[0];

        try {
            bot.sendSticker(chatId, stickerId);
        } catch (err) {
            console.log("invalid sticker syntax " + err)
        } finally {
            return;
        }
    }
    // if (quoteId) {
    //     var options = {
    //         reply_markup: JSON.stringify({
    //             inline_keyboard: [[
    //                 {text: '😀', callback_data: '+|' + quoteId},
    //                 {text: "😑", callback_data: '-|' + quoteId},
    //                 {text: "❌", callback_data: '0'}
    //             ]]
    //         })
    //     };
    //     bot.sendMessage(chatId, message, options);
    //     return;
    // }
    var options = {
        parse_mode: "Markdown"
    };
    if (message == process.env.OLLI1) {
        bot.sendMessage(chatId, process.env.OLLI2, options);
        return
    }
    message = message.replace(":user:", msg.from.first_name);

    bot.sendMessage(chatId, message, options);

}


function sentTotallyRandom(msg) {
    var chatId = msg.chat.id;

    db.Quote.findRandom(function (err, quote) {
        if (quote[0]) {
            sendToChat(msg, quote[0].quote);
        } else {
            getQuoteForGroup(chatId, group_id, '.');
        }
    });

}

module.exports = {
    addGroup: addGroup,
    addToGroup: addToGroup,
    escape: escape,
    getQuoteForGroup: getQuoteForGroup,
    sendToChat: sendToChat,
    quote: quote,
    sentTotallyRandom: sentTotallyRandom,
    start: start,
    quote: quote,
    imfeelinglucky: imfeelinglucky,
    add:add,
    voteCallback:voteCallback
}


