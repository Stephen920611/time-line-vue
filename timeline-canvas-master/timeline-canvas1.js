var TimeSlider = function (elementId, options) {
    var self = this;
    this.canvas = document.getElementById(elementId);
    this.ctx = this.canvas.getContext("2d");
    this.canvansW = this.canvas.width;
    this.canVansH = this.canvas.height;
    this.timecell = options.init_cells;

    //默认的当前天的0点
    this.default_start_time = new Date(new Date(new Date().toLocaleDateString()).getTime()).getTime();
    //默认的当前天的23点59分59秒
    this.default_end_time = new Date( new Date( new Date().toLocaleDateString() ).getTime() + 24 * 60 * 60 * 1000 - 1).getTime();

    this.minutes_per_step = [1, 2, 5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 720, 1440]; // min/格
    this.graduation_step = 20;//刻度间最小宽度，单位px
    this.hours_per_ruler = 24;//时间轴显示24小时
    //this.start_timestamp = new Date().getTime() - 12*60*60*1000;
    //1毫秒的长度
    this.px_per_ms = this.canvansW / (this.hours_per_ruler * 60 * 60 * 1000); // px/ms
    //用来计算当前缩放等级最左侧的时间
    this.ms_per_px = (this.hours_per_ruler * 3600 * 1000) / this.canvansW; // ms/px
    // this.start_timestamp = new Date('2019-06-18 00:00:00').getTime();
    this.start_timestamp = new Date(new Date(new Date().toLocaleDateString()).getTime()).getTime();
    // this.end_timestamp = new Date('2019-06-18 23:59:59').getTime();//新增代码
    this.end_timestamp = new Date( new Date( new Date().toLocaleDateString() ).getTime() + 24 * 60 * 60 * 1000 - 1).getTime();//新增代码
    this.current_time = new Date().getTime();   //
    this.minTime = new Date('2019-06-18 00:00:00').getTime();
    this.maxTime = new Date('2019-06-18 23:59:59').getTime();

    this.markType = 1;//默认是标记开始时间,1-标记开始时间，2-标记结束时间
    this.markedStartTime = null;//已标记的开始时间
    this.markedEndTime = null;//已标记的结束时间

    this.distance_between_gtitle = 80;
    //缩放等级
    this.zoom = 24;
    this.g_isMousedown = false;//拖动mousedown标记
    this.g_isMousemove = false;//拖动mousemove标记
    this.g_mousedownCursor = null;//拖动mousedown的位置
    this.returnTime = null;//mouseup返回时间

    this.on_before_click_ruler_callback = null;

    this.setTimeMove = null;

    // //1秒延迟后设置到当前时间
    // $("#setTimeMove").onclick = function(){
    //     console.log(111);
    //     clearInterval(self.setTimeMove);
    //     self.setTimeMove = setInterval(function(){
    //         /*模拟数据*/
    //         var temporaryValue = [
    //             {
    //                 "beginTime": self.start_timestamp,
    //                 "endTime": new Date().getTime(),
    //                 "style": {
    //                     "background":"rgba(132, 244, 180, 0.498039)"
    //                 }
    //             }
    //         ];
    //
    //         self.move_to_current_time(self.start_timestamp, new Date().getTime(), self.end_timestamp, temporaryValue);
    //     },1000)
    // };
    //
    // $("#stopTimeMove").onclick = function(){
    //     clearInterval(self.setTimeMove);
    // };

    this.init(this.start_timestamp, this.timecell, false);
    return this;
};

/**
 * 初始化
 * @param {*} start_timestamp 最左侧时间
 * @param {*} timecell 录像段数组
 * @param {*} redrawFlag 是否重绘标记 true是重绘， 第一次进入是false
 * @param {*} current_time 当前时间
 * @param {*} end_timestamp 最右侧时间
 */
TimeSlider.prototype.init = function (start_timestamp, timecell, redrawFlag, current_time, end_timestamp) {
    console.log(start_timestamp,'start_timestamp');
    console.log(new Date(start_timestamp).Format("yyyy-MM-dd hh:mm:ss"),'xxxxxxx');
    this.timecell = timecell;
    this.start_timestamp = start_timestamp;
    this.current_time = current_time;
    this.end_timestamp = end_timestamp;
    //绘制录像块背景
    this.drawCellBg();
    //绘制添加最左侧刻度
    this.add_graduations(start_timestamp);
    //添加录像段
    this.add_cells(timecell);
    //画线
    this.drawLine(0, this.canVansH, this.canvansW, this.canVansH, "rgb(151, 158, 167)", 1); //底线
    // this.drawLine(this.canvansW / 2, 0, this.canvansW / 2, 33, "rgb(64, 196, 255", 2); //中间播放点时间线
    this.drawLine(this.canvansW * ((current_time-start_timestamp) / (end_timestamp-start_timestamp)), 0, this.canvansW * ((current_time-start_timestamp) / (end_timestamp-start_timestamp)), 33, "rgb(64, 196, 255", 2); //中间播放点时间线
    if (!redrawFlag) {//只有第一次进入才需要添加事件
        this.add_events();
    }
    var time = start_timestamp + (this.hours_per_ruler * 3600 * 1000) / 2;
    this.ctx.fillStyle = "rgb(64, 196, 255";
    //画刻度线
    this.ctx.fillText(this.changeTime(current_time), this.canvansW * ((current_time-start_timestamp) / (end_timestamp-start_timestamp)) - 60, 50);

    if (this.markedStartTime != null) { //绘制标记的开始时间
        this.drawMarkPoint(this.markedStartTime, 1);
    }

    if (this.markedEndTime != null && this.markedEndTime > this.markedStartTime) { //绘制标记的结束时间
        this.drawMarkPoint(this.markedEndTime, 2);
    }
};

/**
 * 绘制添加刻度
 * @param {*} start_timestamp 最左侧时间
 */
TimeSlider.prototype.add_graduations = function (start_timestamp) {
    var _this = this;
    var px_per_min = _this.canvansW / (_this.hours_per_ruler * 60); // px/min
    var px_per_ms = _this.canvansW / (_this.hours_per_ruler * 60 * 60 * 1000); // px/ms
    var px_per_step = _this.graduation_step;  // px/格 默认最小值20px
    var min_per_step = px_per_step / px_per_min; // min/格

    for (var i = 0; i < _this.minutes_per_step.length; i++) {
        if (min_per_step <= _this.minutes_per_step[i]) { //让每格时间在minutes_per_step规定的范围内
            min_per_step = _this.minutes_per_step[i];
            px_per_step = px_per_min * min_per_step;
            break;
        }
    }

    var medium_step = 30;
    for (var i = 0; i < _this.minutes_per_step.length; i++) {
        if (_this.distance_between_gtitle / px_per_min <= _this.minutes_per_step[i]) {
            medium_step = _this.minutes_per_step[i];
            break;
        }
    }

    var num_steps = _this.canvansW / px_per_step; //总格数
    var graduation_left;
    var graduation_time;
    var caret_class;
    var lineH;
    var ms_offset = _this.ms_to_next_step(start_timestamp, min_per_step * 60 * 1000);//开始的偏移时间 ms
    var px_offset = ms_offset * px_per_ms; //开始的偏移距离 px
    var ms_per_step = px_per_step / px_per_ms; // ms/step

    //画
    for (var i = 0; i < num_steps; i++) {
        graduation_left = px_offset + i * px_per_step; // 距离=开始的偏移距离+格数*px/格
        graduation_time = start_timestamp + ms_offset + i * ms_per_step; //时间=左侧开始时间+偏移时间+格数*ms/格
        var date = new Date(graduation_time);
        if (date.getUTCHours() == 0 && date.getUTCMinutes() == 0) {
            caret_class = 'big';
            lineH = 25;
            var big_date = _this.graduation_title(date);
            _this.ctx.fillText(big_date, graduation_left - 20, 30);
            _this.ctx.fillStyle = "rgba(151,158,167,1)";
        } else if (graduation_time / (60 * 1000) % medium_step == 0) {
            caret_class = 'middle';
            lineH = 15;
            var middle_date = _this.graduation_title(date);
            _this.ctx.fillText(middle_date, graduation_left - 20, 30);
            _this.ctx.fillStyle = "rgba(151,158,167,1)";
        } else {
            lineH = 10;
        }
        // drawLine(graduation_left,0,graduation_left,lineH,"rgba(151,158,167,0.4)",1);
        _this.drawLine(graduation_left, 0, graduation_left, lineH, "rgba(151,158,167,1)", 1);
    }
}

/**
 * 绘制线
 * @param {*} beginX
 * @param {*} beginY
 * @param {*} endX
 * @param {*} endY
 * @param {*} color
 * @param {*} width
 */
TimeSlider.prototype.drawLine = function (beginX, beginY, endX, endY, color, width) {
    this.ctx.beginPath();
    this.ctx.moveTo(beginX, beginY);
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.stroke();
}

/**
 * 添加录像段
 * @param {*} cells 录像数组
 */
TimeSlider.prototype.add_cells = function (cells) {
    var _this = this;
    cells.forEach(cell => {
        _this.draw_cell(cell)
    });
}

/**
 * 绘制录像块
 * @param {*} cell cell包括beginTime ms;endTime ms;style
 */
TimeSlider.prototype.draw_cell = function (cell) {
    var _this = this;
    var px_per_ms = _this.canvansW / (_this.hours_per_ruler * 60 * 60 * 1000); // px/ms
    var beginX = (cell.beginTime - _this.start_timestamp) * px_per_ms;
    var cell_width = ( cell.endTime - cell.beginTime) * px_per_ms;
    if (cell.style) {
        _this.ctx.fillStyle = cell.style.background;
    } else {
        _this.ctx.fillStyle = "rgba(0, 255, 78, 0.6)";
    }

    _this.ctx.fillRect(beginX, 0, cell_width, 15);
}

/**
 * 绘制录像块背景
 */
TimeSlider.prototype.drawCellBg = function () {
    this.ctx.fillStyle = "rgba(69, 72, 76, 0.5)";
    this.ctx.fillRect(0, 0, this.canvansW, 15);
}

/**
 * 时间轴事件
 */
TimeSlider.prototype.add_events = function () {
    var _this = this;
    if (_this.canvas.addEventListener) {
        _this.canvas.addEventListener('mousewheel', _this.mousewheelFunc.bind(_this));
        _this.canvas.addEventListener('mousedown', _this.mousedownFunc.bind(_this));
        _this.canvas.addEventListener('mousemove', _this.mousemoveFunc.bind(_this));
        _this.canvas.addEventListener('mouseup', _this.mouseupFunc.bind(_this));
        _this.canvas.addEventListener('mouseout', _this.mouseoutFunc.bind(_this));
        _this.canvas.addEventListener('dblclick', _this.dblclickFunc.bind(_this));
    }
};

TimeSlider.prototype.dblclickFunc = function (e) {
    var _this = this;
    var posx = _this.get_cursor_x_position(e); //鼠标距离 px
    var ms_per_px = (_this.zoom * 3600 * 1000) / _this.canvansW; // ms/px
    _this.returnTime = _this.start_timestamp + posx * ms_per_px;
    alert(new Date(_this.returnTime).Format("yyyy-MM-dd hh:mm:ss"));
}

/**
 * 拖动/点击 mousedown事件
 */
TimeSlider.prototype.mousedownFunc = function (e) {
    this.g_isMousedown = true;
    this.g_mousedownCursor = this.get_cursor_x_position(e);//记住mousedown的位置
    clickRightHtml.style.display = "none";//每次右键都要把之前显示的菜单隐藏哦
}

/**
 * 拖动/鼠标hover显示 mousemove事件
 */
TimeSlider.prototype.mousemoveFunc = function (e) {
    var _this = this;
    //获取鼠标posx
    var pos_x = _this.get_cursor_x_position(e);
    var px_per_ms = _this.canvansW / (_this.hours_per_ruler * 60 * 60 * 1000); // px/ms
    _this.clearCanvas();
    if (_this.g_isMousedown) {
        var diff_x = pos_x - _this.g_mousedownCursor;
        _this.start_timestamp = _this.start_timestamp - Math.round(diff_x / px_per_ms);
        _this.end_timestamp = _this.start_timestamp + (_this.hours_per_ruler * 3600 * 1000);

        if (_this.start_timestamp < _this.minTime) {
            _this.init(_this.minTime, _this.timecell, true);
        }
        if (_this.end_timestamp > _this.maxTime) {
            _this.start_timestamp = _this.maxTime - (_this.hours_per_ruler * 3600 * 1000);
            _this.init(_this.start_timestamp, _this.timecell, true);
        }
        if (_this.start_timestamp > _this.minTime && _this.end_timestamp < _this.maxTime) {
            _this.init(_this.start_timestamp, _this.timecell, true);
        }

        //this.markedTime = null;//已标记的时间
        //this.markedPosx = null;

        _this.g_isMousemove = true;
        _this.g_mousedownCursor = pos_x;

    } else {
        //滑动
        let time = _this.start_timestamp + pos_x / px_per_ms;
        //保持绘制的线
        _this.init(_this.start_timestamp, _this.timecell, true, _this.current_time, _this.end_timestamp);
        //画鼠标当前的提示线
        _this.drawLine(pos_x, 0, pos_x, 50, "rgb(194, 202, 215)", 1);
        _this.ctx.fillStyle = "rgb(194, 202, 215)";
        _this.ctx.fillText(_this.changeTime(time), pos_x - 50, 60);
    }
};


/**
 * 滚轮放大缩小，以时间轴中心为准 mousewheel事件
 */
TimeSlider.prototype.mousewheelFunc = function (event) {
    if (event && event.preventDefault) {
        event.preventDefault()
    } else {
        window.event.returnValue = false;
        return false;
    }

    var e = window.event || event;


    //IE、chrome浏览器使用的是wheelDelta，并且值为“正负120”，FF浏览器使用的是detail,其值为“正负3”
    //因为IE、chrome等向下滚动是负值，FF是正值，为了处理一致性，在此取反处理，所以下面是容错处理，获取滚轮是放大还是缩小，向上滚动是放大，向下滚动是缩小
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

    //获取鼠标posx
    var pos_x = this.get_cursor_x_position(e);
    //获取当前时间
    var currentTime = this.start_timestamp + pos_x * this.ms_per_px;
    console.log(this.ms_per_px,'_this.ms_per_px');

    // var middle_time = _this.start_timestamp + (_this.hours_per_ruler * 3600 * 1000) / 2; //ms 记住当前中间的时间
    //delta<0是向下滚动，>0是向上滚动
    if (delta < 0) {
        this.zoom = this.zoom + 4;
        if (this.zoom >= 24) {
            this.zoom = 24;//放大最大24小时
        }
        this.hours_per_ruler = this.zoom;
    } else if (delta > 0) {// 放大
        this.zoom = this.zoom - 4;
        if (this.zoom <= 1) {
            this.zoom = 1;//缩小最小1小时
        }
        this.hours_per_ruler = this.zoom;
    }
    this.ms_per_px = (this.hours_per_ruler * 3600 * 1000) / this.canvansW;
    console.log(this.ms_per_px,'_this.ms_per_px');

    //清空canvas
    this.clearCanvas();
    //更新当前时间
    this.start_timestamp = currentTime - (pos_x * this.ms_per_px); //start_timestamp = 鼠标悬停的当前时间 - 当前缩放等级下每个px的ms数 * 鼠标x坐标]
    console.log(new Date(this.start_timestamp).Format("yyyy-MM-dd hh:mm:ss"),'sss');
    this.init(this.start_timestamp, this.timecell, true, this.current_time, this.end_timestamp)
};

/**
 * 鼠标移出隐藏时间 mouseout事件
 * @param {*} e
 */
TimeSlider.prototype.mouseoutFunc = function () {
    var _this = this;
    _this.clearCanvas();
    _this.init(_this.start_timestamp, _this.timecell, true, _this.current_time, _this.end_timestamp);
};

/**
 * 拖动/点击 mouseup事件
 */
TimeSlider.prototype.mouseupFunc = function (e) {
    var _this = this;
    if (_this.g_isMousemove) { //拖动 事件
        _this.g_isMousemove = false;
        _this.g_isMousedown = false;
        _this.returnTime = _this.start_timestamp + (_this.hours_per_ruler * 3600 * 1000) / 2;
    } else { // click 事件
        _this.g_isMousedown = false;
        // var posx = _this.get_cursor_x_position(e); //鼠标距离 px
        // var ms_per_px = (_this.zoom * 3600 * 1000) / _this.canvansW; // ms/px
        // _this.returnTime = _this.start_timestamp + posx * ms_per_px;
        // alert(_this.returnTime);
        //_this.set_time_to_middle(_this.returnTime);
    }
};

TimeSlider.prototype.contextmenuFunc = function (e) {
    var _this = this;
    var posx = _this.get_cursor_x_position(e); //鼠标距离 px
    var ms_per_px = (_this.zoom * 3600 * 1000) / _this.canvansW; // ms/px
    _this.returnTime = _this.start_timestamp + posx * ms_per_px;

    //_this.set_time_to_middle(_this.returnTime);

    _this.ctx.beginPath();
    _this.ctx.arc(100, 50, 40, 0, 2 * Math.PI);
    //ctx.arc(posx,this.canVansH,5,0,2*Math.PI);
    _this.ctx.fillStyle = "red";
    _this.ctx.fill();
    _this.ctx.stroke();
}

TimeSlider.prototype.setMarkType = function (type) { //标记时间点
    this.markType = type;
}

TimeSlider.prototype.clearMark = function () { //清除标记的时间点
    this.markedStartTime = null;
    this.markedEndTime = null;
    this.clearCanvas();
    this.markType = 1;
    this.init(this.start_timestamp, this.timecell, true);

}

TimeSlider.prototype.markPoint = function (e) { //标记时间点

    var posx = this.get_cursor_x_position(e); //鼠标距离 px
    var ms_per_px = (this.zoom * 3600 * 1000) / this.canvansW; // ms/px

    if (this.markType == 1) {

        this.markedStartTime = this.start_timestamp + posx * ms_per_px;
        this.drawMarkPoint(this.markedStartTime, 1);
        if (this.markedEndTime != null && this.markedEndTime <= this.markedStartTime) {
            this.markedEndTime = null;
        }
    }

    if (this.markType == 2) {
        if (!this.markedStartTime) {
            alert('请先标记开始时间！');
        } else {
            this.markedEndTime = this.start_timestamp + posx * ms_per_px;
            if (this.markedEndTime <= this.markedStartTime) {
                alert('结束时间不得小于或等于结束时间！');
            } else {
                this.drawMarkPoint(this.markedEndTime, 2);
            }

        }
    }
}

/**
 * 画开始时间和结束时间的刻度线
 * @param markedTime 标记的时间
 * @param type 1表示开始时间，2表示结束时间
 */
TimeSlider.prototype.drawMarkPoint = function (markedTime, type) { //markedTime-标记的时间；type-1表示开始时间，2表示结束时间

    var diff = markedTime - this.start_timestamp;
    var ms_per_px = (this.zoom * 3600 * 1000) / this.canvansW; // ms/px

    var posx = null;
    if (diff > 0) {
        posx = diff / ms_per_px;
        if (type == 1) {
            this.drawLine(posx, 0, posx, 50, "rgb(60, 255, 0)", 1);
            this.ctx.fillStyle = "rgb(60, 255, 0)";
            this.ctx.fillText(this.changeTime(markedTime), posx - 50, 60);

        }
        if (type == 2) {
            this.drawLine(posx, 0, posx, 50, "rgb(255, 144, 0)", 1);
            this.ctx.fillStyle = "rgb(255, 144, 0)";
            this.ctx.fillText(this.changeTime(markedTime), posx - 50, 60);
        }

    }
}


/**
 * 获取鼠标posx
 * @param {*} e
 */
TimeSlider.prototype.get_cursor_x_position = function (e) {
    var posx = 0;

    if (!e) {
        e = window.event;
    }

    if (e.pageX || e.pageY) {
        posx = e.pageX;
    } else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    }

    return posx;
}

/**
 * 返回时间轴上刻度的时间
 * @param {*} datetime new Date 格式
 */
TimeSlider.prototype.graduation_title = function (datetime) {
    if (datetime.getHours() == 0 && datetime.getMinutes() == 0 && datetime.getMilliseconds() == 0) {
        return ('0' + datetime.getDate().toString()).substr(-2) + '.' +
            ('0' + (datetime.getMonth() + 1).toString()).substr(-2) + '.' +
            datetime.getFullYear();
    }
    return datetime.getHours() + ':' + ('0' + datetime.getMinutes().toString()).substr(-2);
};

/**
 * 返回 2018-01-01 10:00:00 格式时间
 * @param {*} time
 */
TimeSlider.prototype.changeTime = function (time) {
    var newTime = new Date(time);
    var year = newTime.getFullYear();
    var month = newTime.getMonth() + 1;
    if (month < 10) {
        var month = "0" + month;
    }
    var date = newTime.getDate();
    if (date < 10) {
        var date = "0" + date;
    }
    var hour = newTime.getHours();
    if (hour < 10) {
        var hour = "0" + hour;
    }
    var minute = newTime.getMinutes();
    if (minute < 10) {
        var minute = "0" + minute;
    }
    var second = newTime.getSeconds();
    if (second < 10) {
        var second = "0" + second;
    }
    return year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
}

/**
 * 左侧开始时间的偏移，返回单位ms
 * @param {*} timestamp
 * @param {*} step
 */
TimeSlider.prototype.ms_to_next_step = function (timestamp, step) {
    var remainder = timestamp % step;
    return remainder ? step - remainder : 0;
}

/**
 * 设置时间，让这个时间点跳到中间红线处
 *  @param {*} time 单位ms
 *  @param {*} timecell 单位ms
 */
TimeSlider.prototype.set_time_to_middle = function (time, timecell) {
    this.clearCanvas();
    this.start_timestamp = time - (this.hours_per_ruler * 60 * 60 * 1000) / 2;
    this.init(this.start_timestamp, timecell, true)
};


/**
 * 默认显示当天时间，如果传时间就按照传的时间来增加
 *  @param {*} timecell 单位ms
 */
TimeSlider.prototype.move_to_current_time = function (start_time, current_time, end_time, timecell) {
    this.clearCanvas();
    this.start_timestamp = start_time;
    this.current_time = current_time;
    this.end_timestamp = end_time;
    this.init(this.start_timestamp, timecell, true, current_time, this.end_timestamp)
};

/**
 * 返回点击或者拖动的时间点
 */
TimeSlider.prototype.returnMouseupTime = function (callback) {
    var _this = this;
    if (_this.returnTime != null) {
        if (callback) {
            callback(_this.returnTime);
        }
    }
}

/**
 * 清除canvas 每次重新绘制需要先清除
 */
TimeSlider.prototype.clearCanvas = function () {
    this.ctx.clearRect(0, 0, this.canvansW, this.canVansH);
}

/**
 * 插件设置
 * @param {*} options
 * @param {number} start_time 开始时间戳
 * @param {number} end_time 结束时间戳
 * @param {Array} cell 时间块数组
 *                  {
                        "beginTime":new Date().getTime()-0.5*3600*1000,
                        "endTime":new Date().getTime(),
                        "style": {
                            "background":"rgba(132, 244, 180, 0.498039)"
                        }
                    },
 * @param {*} callback
 */
function Plugin(options, start_time, current_time, end_time, cell, callback) {
    return this.each(function () {
        var _this = $(this);
        var _thisId = this.id;
        var data = _this.data('timeslider');
        if (!data) {
            _this.data('timeslider', new TimeSlider(_thisId, options));
        }
        else {
            if (typeof options == 'string') {
                switch (options) {
                    case 'clearMark':
                        data.clearMark();
                        break;
                    case 'setMarkType':
                        data.setMarkType(start_time);
                        break;
                    case 'markPoint':
                        data.markPoint();
                        break;
                    case 'set_time_to_middle':
                        data.set_time_to_middle(start_time, cell);
                        break;
                    case 'move_to_current_time':
                        data.move_to_current_time(start_time, current_time, end_time, cell);
                        break;
                    case 'returnMouseupTime':
                        data.returnMouseupTime(callback);
                        break;
                    case 'init':
                        data.clearCanvas();
                        data.init(start_time, cell, true);
                        break;
                }
            }
            else {
                // data.set_options(options);
            }
        }
    });
}

var old = $.fn.TimeSlider;

$.fn.TimeSlider = Plugin;

$.fn.TimeSlider.noConflict = function () {
    $.fn.TimeSlider = old;
    return this;
};

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1,                 //月份
        "d+": this.getDate(),                    //日
        "h+": this.getHours(),                   //小时
        "m+": this.getMinutes(),                 //分
        "s+": this.getSeconds(),                 //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds()             //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
