const util = require('./util');
const common = require('../common');
const moocServer = require('../../config');
// const css = require('../html/common.css');

module.exports = {
    notic: undefined,
    getTopic: function () {
        let topic = $('.Cy_TItle.clearfix .clearfix');
        if (topic.length <= 0) {
            this.notic.text('未搜索到题目');
            return undefined;
        }
        let text = common.removeHTML($(topic).html());
        text = text.substr(0, text.lastIndexOf('分)'));
        text = text.substr(0, text.lastIndexOf('('));
        return text;
    },
    geTHomeworkTopic: function () {
        let topic = $('.Zy_TItle.clearfix .clearfix');
        if (topic.length <= 0) {
            return undefined;
        }
        let ret = [];
        for (let i = 0; i < topic.length; i++) {
            let text = common.removeHTML($(topic[i]).html());
            let options = $(topic[i]).parent().next();
            let elClass = $(options).attr('class');
            let type = 0;
            if (elClass.indexOf('Zy_ulTk') >= 0 && /第.空/.test($(options).text())) {
                type = 4;
            } else if (elClass.indexOf('Zy_ulBottom') >= 0) {
                type = 3;
            } else if (elClass.indexOf('clearfix') >= 0) {
                //多选/单选
                type = $(options).find('[type="radio"]').length > 0 ? 1 : 2;
            } else {
                util.signleLine('暂不支持的类型', 'answer' + i, undefined, options);
                continue;
            }
            ret.push({
                index: i,
                topic: text,
                type: type,
                options: options
            });
        }
        return ret;
    },
    createBtn: function (className, after) {
        let btn = util.createBtn('搜索答案', '搜索题目答案');
        if (after == true) {
            $(className).after(btn);
        } else {
            $(className).append(btn);
        }
        return btn;
    },
    homework: function () {
        let self = this;
        let btn = self.createBtn('.CyTop');
        btn.onclick = function () {
            $(btn).text('搜索中...');
            //搜索答案
            let topic = self.geTHomeworkTopic();
            if (topic == undefined) {
                return false;
            }
            function requestAnswer(page) {
                let post = '';
                for (let i = (page * 5), n = 0; i < topic.length && n < 5; i++ , n++) {
                    post += 'topic[' + n + ']=' + topic[i].topic + '&type[' + n + ']=' + topic[i].type + '&';
                }
                if (post == '') {
                    $(btn).text('搜索完成');
                    return;
                }
                common.gm_post(moocServer.url + 'v2/answer', post, false, function (data) {
                    let json = JSON.parse(data);
                    for (let i = 0; i < json.length; i++) {
                        let index = json[i].index + page * 5;
                        if (json[i].result.length <= 0) {
                            util.signleLine('无答案', 'answer' + index, undefined, topic[index].options);
                            continue;
                        }
                        self.fillHomeWorkAnswer(topic[index], json[i].result[Math.floor(Math.random() * Math.floor(json[i].result.length))]);
                    }
                    setTimeout(() => { requestAnswer(page + 1); }, 1000);
                }).error(function () {
                    $(btn).text('网络错误');
                });
            }
            requestAnswer(0);
            return false;
        }
    },
    fillHomeWorkAnswer: function (topic, answer) {
        let correct = answer.correct;
        switch (topic.type) {
            case 1:
            case 2: {
                let options = $(topic.options).find('input');
                let noticText = this.fillSelect(options, correct);
                util.signleLine(noticText, 'answer' + topic.index, undefined, topic.options);
                break;
            }
            case 3: {
                let options = $(topic.options).find('input');
                this.fillJudge(options, correct);
                util.signleLine('答案:' + correct[0].option, 'answer' + topic.index, undefined, topic.options);
                break;
            }
            case 4: {
                let options = $(topic.options).find('input[type="text"]');
                let notic = '';
                for (let i = 0; i < options.length; i++) {
                    let pos = common.substrEx($(options[i]).parent().find('.red.fb.font14').text(), '第', '空');
                    for (let n = 0; n < correct.length; n++) {
                        if (correct[n].option == pos) {
                            notic += ' 第' + pos + '空:' + correct[n].content + '<br/>';
                            $(options[n]).val(correct[n].content);
                            break;
                        }
                    }
                }
                util.signleLine(notic, 'answer' + topic.index, undefined, topic.options);
                break;
            }
        }
    },
    exam: function () {
        let self = this;
        let btn = self.createBtn('.Cy_ulBottom.clearfix.w-buttom,.Cy_ulTk,.Cy_ulBottom.clearfix', true);
        btn.onclick = function () {
            //搜索答案
            self.notic = util.signleLine('搜索答案中...', 'answer', btn.parentElement);
            let topic = self.getTopic();
            if (topic == undefined) {
                return false;
            }
            common.gm_post(moocServer.url + 'v2/answer', 'topic[0]=' + topic, false, function (data) {
                let json = JSON.parse(data);
                if (json[0].result.length <= 0) {
                    return self.notic.text('未找到答案');
                }
                let answer = json[0].result[Math.floor(Math.random() * Math.floor(json[0].result.length))];
                //填充
                self.fillAnswer(answer);
            }).error(function () {
                self.notic.text('网络错误');
            });
            return false;
        }
        if (config.auto) {
            btn.onclick();
        }
    },
    fillSelect: function (options, correct) {
        let noticText = '';
        $(options).removeAttr('checked');
        for (let i = 0; i < correct.length; i++) {
            let index = (correct[i].option.charCodeAt() | 32) - 97;
            $(options[index]).click();
            noticText += correct[i].option + ':' + correct[i].content + '<br/>';
        }
        return noticText;
    },
    fillJudge: function (options, correct) {
        $(options).removeAttr('checked');
        let index = 1;
        if (correct[0].option) {
            index = 0;
        }
        // $(options[index]).attr('checked', true);
        $(options[index]).click();
    },
    fillAnswer: function (answer) {
        let correct = answer.correct;
        switch (answer.type) {
            case 1:
            case 2: {
                let options = $('.Cy_ulBottom.clearfix.w-buttom li input');
                if (options.length <= 0) {
                    this.notic.text('答案搜索错误');
                    return false;
                }
                let noticText = this.fillSelect(options, correct);
                $(this.notic).html(noticText);
                break;
            }
            case 3: {
                let options = $('.Cy_ulBottom.clearfix li input');
                if (options.length <= 0) {
                    this.notic.text('答案搜索错误');
                    return false;
                }
                this.fillJudge(options, correct);
                $(this.notic).html('答案:' + correct[0].option);
                break;
            }
            case 4: {
                let options = $('.Cy_ulTk .XztiHover1');
                if (options.length <= 0) {
                    this.notic.text('答案搜索错误');
                    return false;
                }
                let notic = '';
                for (let i = 0; i < options.length; i++) {
                    let pos = common.substrEx($(options[i]).find('.fb.font14').text(), '第', '空');
                    for (let n = 0; n < correct.length; n++) {
                        if (correct[n].option == pos) {
                            notic += ' 第' + pos + '空:' + correct[n].content + '<br/>';
                            var uedit = $(options[n]).find('textarea');
                            if (uedit.length <= 0) {
                                this.notic.text('答案搜索错误');
                                return false;
                            }
                            UE.getEditor(uedit.attr('name')).setContent(correct[n].content);
                            break;
                        }
                    }
                }
                $(this.notic).html(notic);
                break;
            }
            default: {
                this.notic.text('不支持的答案类型:' + JSON.stringify(correct));
                return false;
            }
        }
        return true;
    },
    collect: function (college_type) {
        let timu = $('.TiMu');
        let answer = [];
        for (let i = 0; i < timu.length; i++) {
            let topic = undefined;
            if (college_type == 'home') {
                topic = $(timu[i]).find('.Zy_TItle.clearfix .clearfix div:first-child');
            } else {
                topic = $(timu[i]).find('.Cy_TItle.clearfix .clearfix');
            }
            if (topic.length <= 0) {
                continue;
            }
            let correct = $(timu[i]).find('.Py_answer.clearfix,.Py_tk');
            if ($(correct).text().indexOf('正确答案') >= 0 ||
                $(correct).find('.dui').length > 0) {
                correct = common.removeHTML($(correct).find('span:first,p:first').html());
            } else {
                continue;
            }
            let topicText = common.removeHTML(topic.html());
            let options = undefined;
            if (college_type == 'home') {
                options = $(timu[i]).find('.Cy_ulTop li,.Zy_ulTop li');
            } else {
                options = $(timu[i]).find('.Cy_ulTop li');
                topicText = topicText.substr(0, topicText.lastIndexOf('('));
            }
            let pushOption = { topic: topicText, answer: [], correct: [] };
            if (options.length <= 0) {
                //非选择
                let is = false;
                if ((is = correct.indexOf('√')) > 0 || correct.indexOf('×') > 0) {
                    if (is > 0) {
                        pushOption.correct.push({ option: true, content: true });
                    } else {
                        pushOption.correct.push({ option: false, content: false });
                    }
                    pushOption.type = 3
                } else {
                    let options = undefined;
                    if (college_type == 'home') {
                        options = $(timu[i]).find('div.font14');
                    } else {
                        options = $(timu[i]).find('.Py_answer div:first .font14.clearfix');
                    }
                    for (let n = 0; n < options.length; n++) {
                        if ($(options[n]).find('.dui').length <= 0) {
                            continue;
                        }
                        let option = $(options[n]).find('.fb.fl').text();
                        if (option == null) {
                            break;
                        }
                        option = common.substrEx(option, '第', '空');
                        let content = undefined;
                        if (college_type == 'home') {
                            content = $(options[n]).find('div.clearfix').html();
                        } else {
                            content = $(options[n]).find('div.fl').html();
                        }
                        pushOption.correct.push({ option: option, content: common.removeHTML(content) });
                    }
                    pushOption.type = 4;
                }
            } else {
                let correctText = correct.match(/\w+/);
                if (correctText == null) {
                    continue;
                }
                correctText = correctText[0];
                for (let n = 0; n < options.length; n++) {
                    let option = $(options[n]).find('.fl:first-child').text().replace('、', '');
                    let tmp = {
                        option: option,
                        content: common.removeHTML($(options[n]).find('.clearfix,.fl:last-child').html())
                    };
                    if (correctText.indexOf(option) >= 0) {
                        pushOption.correct.push(tmp);
                    }
                    pushOption.answer.push(tmp);
                }
                pushOption.type = correctText.length <= 1 ? 1 : 2;
            }
            answer.push(pushOption);
        }
        // console.log(answer);
        common.gm_post(moocServer.url + 'answer', JSON.stringify(answer), true, function () {
            let box = util.pop_prompt("√  答案自动记录成功");
            $(document.body).append(box);
            setTimeout(function () { box.style.opacity = "1"; }, 500);
        });
    }
};