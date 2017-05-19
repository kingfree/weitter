// ==UserScript==
// @name         weibo-twitter-mix
// @namespace    http://kingfree.moe/
// @version      0.1
// @description  mix twitter stream into weibo timeline
// @author       kingfree@toyama.moe
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// @require      https://raw.githubusercontent.com/jublonet/codebird-js/develop/codebird.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/sweetalert/1.1.3/sweetalert.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/locale/zh-cn.js
// @require      https://raw.githubusercontent.com/twitter-archive/twitter-text-js/version_1_9_1/twitter-text.js
// @resource style https://cdnjs.cloudflare.com/ajax/libs/sweetalert/1.1.3/sweetalert.min.css
// @grant        GM_addStyle
// @include           http://www.weibo.com/*
// @include           http://weibo.com/*
// @include           http://d.weibo.com/*
// @include           http://s.weibo.com/*
// @exclude           http://weibo.com/a/bind/*
// @exclude           http://weibo.com/nguide/*
// @exclude           http://weibo.com/
// ==/UserScript==

var keys = {
    consumerKey: "bIIPZPR13bxXO1EEWdL41qwN3",
    consumerSecret: "oTJuLJGcHt6L2WYNTGv5QLi6L0KE7efutvujUeqXJyyi76Nsc0"
};

var cb = new Codebird();
// cb.setUseProxy(false);

cb.setConsumerKey(keys.consumerKey, keys.consumerSecret);

function loginTwitter(callback) {
    cb.__call(
        "oauth_requestToken",
        {oauth_callback: "oob"},
        function (reply, rate, err) {
            console.log(reply);
            if (err) {
                console.log("error response or timeout exceeded" + err.error);
            }
            if (reply) {
                // stores it
                cb.setToken(reply.oauth_token, reply.oauth_token_secret);

                // gets the authorize screen URL
                cb.__call(
                    "oauth_authorize",
                    {},
                    function (auth_url) {
                        window.codebird_auth = window.open(auth_url);
                        swal({
                            title: '输入推特PIN码',
                            type: "input",
                            showCancelButton: true,
                            confirmButtonText: "登录",
                            cancelButtonText: "取消",
                            closeOnConfirm: false,
                            showLoaderOnConfirm: true
                        }, function (inputValue) {
                            if (inputValue === false) return false;

                            cb.__call(
                                "oauth_accessToken",
                                {oauth_verifier: inputValue},
                                function (reply, rate, err) {
                                    if (err) {
                                        swal({
                                            title: '登录推特失败',
                                            text: err.error,
                                            type: "error",
                                            confirmButtonText: "关闭",
                                            closeOnConfirm: true
                                        });
                                        console.log("error response or timeout exceeded" + err.error);
                                    }
                                    if (reply) {
                                        // store the authenticated token, which may be different from the request token (!)
                                        cb.setToken(reply.oauth_token, reply.oauth_token_secret);
                                        localStorage.setItem('oauth_token', reply.oauth_token);
                                        localStorage.setItem('oauth_token_secret', reply.oauth_token_secret);

                                        cb.__call(
                                            "account_verifyCredentials",
                                            {},
                                            function (reply) {
                                                console.log(reply);
                                                swal({
                                                    title: '登录推特成功',
                                                    text: JSON.stringify(reply),
                                                    type: "success",
                                                    confirmButtonText: "关闭",
                                                    closeOnConfirm: true
                                                }, function () {
                                                    callback();
                                                });
                                            }
                                        );
                                    }

                                }
                            );
                            return true;
                        });
                    }
                );
            }
        }
    );
}

function getInsertWeibo(tweet) {
    var date = Date.parse(tweet.created_at);
    var arr = $('.WB_feed_type');
    // return arr[arr.length - 1];
    for (var i = 1; i < arr.length; i++) {
        var d = $(arr[i]).find('.WB_feed_detail .WB_detail .WB_from a').attr('date');
        if (d < date) {
            return arr[i];
        }
    }
    return arr[0];
}

function parseTweetText(text, entities) {
    text = text.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;').replace(/\t/g, '&emsp;');
    if (twttr) {
        if (entities) {
            return twttr.txt.autoLink(text, {
                urlEntities: entities.urls,
                hashtagsEntities: entities.hashtags,
                symbolsEntities: entities.symbols,
                userMentionsEntities: entities.user_mentions,
            });
        } else {
            return twttr.txt.autoLink(text);
        }
    } else {
        return text;
    }
}

function contentImages(tweet) {
    if (!tweet) return '';
    var res = '';
    var media = {}, medias = [];
    if (tweet.entities && tweet.entities.media && tweet.entities.media.length) {
        media = tweet.entities.media[0];
        if (tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media.length) {
            medias = tweet.extended_entities.media;
        }
        var imgList = '';
        for (var i in medias) {
            if (medias[i]) {
                imgList += '<li><a href="javascript:;" class=" ' + (i == 0 ? 'current' : '') + '"><img class="S_line2" src="' + medias[i].media_url + '" alt=""></a></li>';
            }
        }
        res += `<div class="WB_expand_media_box">
<div class="WB_expand_media S_bg1">
<div class="tab_feed_a clearfix">
<div class="tab">
<ul class="clearfix">
<li><span class="line S_line1"><a href="javascript:;" class="S_txt1"><i class="W_ficon ficon_arrow_fold S_ficon">k</i>收起</a></span></li>
<li><span class="line S_line1"><a href="javascript:;" class="S_txt1"><i class="W_ficon ficon_search S_ficon">f</i>查看大图</a></span></li>
<li><span class="line S_line1"><a href="javascript:;" class="S_txt1"><i class="W_ficon ficon_turnleft S_ficon">m</i>向左旋转</a></span></li>
<li><span class="line S_line1"><a href="javascript:;" class="S_txt1"><i class="W_ficon ficon_turnright S_ficon">n</i>向右旋转</a></span></li>
<li style="display: none;"><span class="line S_line1"><a href="javascript:;" class="S_txt1"><i class="W_ficon ficon_replay S_ficon">y</i>重播</a></span></li>
</ul>
</div>
</div>
<div class="WB_media_view">
<div class="media_show_box">
<ul class="clearfix" style="background-image: url(&quot;about:blank&quot;);">
<li class="clearfix smallcursor">
<div class="artwork_box">
<div style="position: relative; opacity: 1; zoom: 1;">
<img src="` + media.media_url + `" width="100%">
</div>
<span><a class="W_btn_alpha" title="赞" href="javascript:"><span><i class="W_ficon ficon_praised">ñ</i></span></a></span>
</div>
<i style="display: none;" class="W_loading"></i>
</li>
</ul>
<div style="top:0px;left:0px;display:none;" class="W_layer">
</div>
</div>
<div class="pic_choose_box clearfix">
<a href="javascript:;" class="arrow_left_small S_bg2 arrow_dis" title="上一页"><i class="W_ficon ficon_arrow_left S_ficon">b</i></a>
<div class="stage_box">
<ul class="choose_box clearfix" style="margin-left: 1px;">` + imgList + `
</ul>
</div>
<a href="javascript:;" class="arrow_right_small arrow_dis S_bg2" title="下一页"><i class="W_ficon ficon_arrow_right S_ficon">a</i></a>
</div>
</div>
</div>
</div>
`;
    }
    return res;
}

function contentFooter(tweet, shoucang) {
    if (!tweet) return '';
    if (shoucang) {
        return '   <ul class="WB_row_line WB_row_r4 clearfix S_line2">'
            + '<li><a class="S_txt2" href="javascript:void(0);"> <span class="pos"> <span class="line S_line1"> <span> <em class="W_ficon ficon_favorite S_ficon">û</em> <em>收藏</em> </span> </span> </span> </a></li>'
            + '    <li><a class="S_txt2" href="javascript:void(0);"> <span class="pos"> <span class="line S_line1"> <span> <em class="W_ficon ficon_forward S_ficon"></em> <em>'
            + (tweet.retweet_count ? tweet.retweet_count : '转发')
            + '</em> </span> </span> </span> </a></li>'
            + '    <li><a class="S_txt2" href="javascript:void(0);"> <span class="pos"> <span class="line S_line1"> <span> <em class="W_ficon ficon_repeat S_ficon"></em> <em>评论</em> </span> </span> </span> </a>'
            + '        <span class="arrow" style="display: none;"> <span class="W_arrow_bor W_arrow_bor_t"> <i class="S_line1"> </i> <em class="S_bg1_br"> </em> </span> </span></li>'
            + '    <li><a href="javascript:void(0);" class="S_txt2" title="赞"> <span class="pos"> <span class="line S_line1"> <span class="' + (tweet.favorited ? 'UI_ani_praised' : '') + '"> <em class="W_ficon ficon_praised S_txt2">ñ</em> <em>'
            + (tweet.favorite_count ? tweet.favorite_count : '赞')
            + '</em> </span> </span> </span> </a></li>'
            + '   </ul>';
    } else {
        return '<ul class="clearfix"> <li> <span class="line S_line1"> <a class="S_txt2" target="_blank" href="' + contentUrl(tweet) + '"> <span> <em class="W_ficon ficon_forward S_ficon"> </em> <em> '
            + (tweet.retweet_count ? tweet.retweet_count : '转发')
            + '</em> </span> </a> </span></li> <li> <span class="line S_line1"> <a class="S_txt2" target="_blank" href="/1777839134/F3r4oj8X6"> <span> <em class="W_ficon ficon_repeat S_ficon"> </em> <em> 评论</em> </span> </a> </span></li> <li> <span class="line S_line1"> <a class="S_txt2" href="javascript:void(0);" title="赞"> <span class=""> <em class="W_ficon ficon_praised S_txt2"> ñ</em> <em> '
            + (tweet.favorite_count ? tweet.favorite_count : '赞')
            + '</em> </span> </a> </span></li> </ul>';
    }
}

function contentUrl(tweet) {
    var user = tweet.user || {};
    return 'https://twitter.com/' + user.screen_name + '/status/' + tweet.id_str;
}

function contentForm(tweet) {
    if (!tweet) return '';
    return '   <a target="_blank" date="' + Date.parse(tweet.created_at) + '" href="' + contentUrl(tweet) + '" title="' + moment(tweet.created_at).format('LLL') + '" class="S_txt2">' + moment(tweet.created_at).fromNow() + '</a> 来自 ' + tweet.source;
}

function contentTweet2Weibo(tweet) {
    if (!tweet) return '';
    console.log(tweet);
    if (!max_id || max_id < tweet.id) {
        max_id = tweet.id;
        localStorage.setItem('max_id', max_id);
    }
    if (!min_id || min_id > tweet.id) {
        min_id = tweet.id;
        localStorage.setItem('min_id', min_id);
    }
    var user = tweet.user || {};
    var res = '<div class="WB_cardwrap WB_feed_type S_bg2">'
        + ' <div class="WB_feed_detail clearfix" lang="' + user.lang + '">'
        + '  <div class="WB_screen W_fr"></div>'
        + '  <div class="WB_face W_fl">'
        + '   <div class="face">'
        + '    <a target="_blank" class="W_face_radius" href="' + user.url + '" title="' + user.name + '">'
        + '     <img title="' + user.name + '" alt="" width="50" height="50" src="' + user.profile_image_url + '" class="W_face_radius">'
        + '    </a>'
        + '   </div>'
        + '  </div>'
        + '  <div class="WB_detail">'
        + '   <div class="WB_info">'
        + '     <a target="_blank" class="W_f14 W_fb S_txt1" title="' + user.name + '" href="' + user.url + '"> ' + user.name + '</a>'
        + '<span class="S_txt2">(@' + user.screen_name + ')</span>'
        + '   </div>'
        + '   <div class="WB_from S_txt2">'
        + contentForm(tweet)
        + '   </div>'
        + '   <div class="WB_text W_f14">' + parseTweetText(tweet.full_text) + '</div>';
    if (tweet.retweeted_status || tweet.quoted_status) {
        var retweeted = tweet.retweeted_status || tweet.quoted_status;
        var pozhu = retweeted.user || {};
        res += `<div class="WB_feed_expand">
<div class="W_arrow_bor W_arrow_bor_t"><i class="S_bg1_br"></i></div>
<div class="WB_expand S_bg1">
<div class="WB_info">
<a target="_blank" class="W_fb S_txt1" href="` + pozhu.url + `" title="` + pozhu.name + `"> @` + pozhu.name + `</a>
</div>
<div class="WB_text">` + parseTweetText(retweeted.full_text) + `</div>
<div class="WB_expand_media_box" style="display: none;"></div>
` + contentImages(retweeted) + `
<div class="WB_func clearfix">
<div class="WB_handle W_fr">
` + contentFooter(retweeted) + `
</ul>
</div>
<div class="WB_from S_txt2">` + contentForm(retweeted) + `</div>
</div>
</div>
</div>
`;
    } else if (tweet.entities) {
        res += contentImages(tweet);
    }
    res += '  </div>'
        + ' </div>'
        + ' <div class="WB_feed_handle"><div class="WB_handle">'
        + contentFooter(tweet, true)
        + '</div></div>'
        + '</div>';
    return res;
}

// var min_id = localStorage.getItem('min_id') || 0, max_id = localStorage.getItem('max_id') || 0;

var max_id = 0, min_id = 0;

function getNewTweets() {
    var params = {
        count: 40,
        tweet_mode: "extended",
        exclude_replies: true
    };
    // if (min_id) {
    //     params.max_id = min_id;
    // }
    if (max_id) {
        params.since_id = max_id;
    }
    cb.__call(
        "statuses_homeTimeline",
        params,
        function (reply, rate, err) {
            if (reply.length && window.location.href.includes('/home')) {
                reply.forEach(function (tweet) {
                    $(getInsertWeibo(tweet)).before(contentTweet2Weibo(tweet));
                });
            }
        }
    );
}

setInterval(function () {
    $('.WB_from a').each(function (a) {
        if ($(a).attr('date')) {
            $(a).text(moment($(a).attr('date').fromNow()));
        }
    });

    if (window.location.href.includes('/home')) {
        getNewTweets();
    }
}, 60 * 1000);

if (!localStorage.getItem('oauth_token')) {
    loginTwitter(getNewTweets);
} else {
    cb.setToken(localStorage.getItem('oauth_token'), localStorage.getItem('oauth_token_secret'));
    getNewTweets();
}
