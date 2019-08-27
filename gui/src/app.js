/* eslint-disable no-console */

const electron = require('electron');
const ipc = electron.ipcRenderer;
const zerorpc = require("zerorpc");
var server = null;
var server_port = -1;

var src_img_size = null;
var row_col_scale_valid = false;
var video_cnt = 0;
var image_cnt = 0;
var progress_status_interval = null;

// ipc register
ipc.on('getPort_callback', (event, port) => {

  if (port<0){
    $('#alert-dialog-content')[0].innerText = "get IPC port failed, please restart it and try again";
    $('#alert-dialog-hidden-btn').click();
  }
  else{
    server_port = port;
    server = new zerorpc.Server({
      status: function (msg, reply) {
        //console.log(msg);
        update_status_from_core(msg);
        reply(null, "");
      }
    });

    server.bind("tcp://0.0.0.0:" + server_port);
    console.log('ready for get core message');
  }

});

ipc.on('getImageSize_callback', (event, dimensions) => {
  console.log(dimensions);
  src_img_size = {};
  src_img_size['width'] = dimensions.width;
  src_img_size['height'] = dimensions.height;

  display_output_info();
});

// OnStart
$(document).ready(function () {

  // get port
  ipc.send('getPort');

  // register event
  $('#src-img-select').click(function () {
    var src_img_path = ipc.sendSync('openDialog', { 'properties': ['openFile'], 'filters': [{ name: 'Images', extensions: ['jpg', 'png', 'bmp'] }]});
    if (src_img_path){
      $('#src-img-input').val(src_img_path);
      ipc.send('getImageSize', src_img_path);
    }
  });

  $('#output-select').click(function () {
    var output_dir_path = ipc.sendSync('openDialog', { 'properties': ['openDirectory'] });
    if (output_dir_path)
      $('#output-dir-input').val(output_dir_path);
  });

  $('#auto-button').click(function () {
    auto_calc_config();
  });

  $('#start-cancel-button').click(function (){
    if ($('#start-cancel-button')[0].innerText == 'Start'){
      validate_config();
    }
    else{
      $('#check-dialog-content')[0].innerText = "Are you sure you want to cancel this job?";
      $('#check-dialog-hidden-btn').click();
    }
  });

  $('#check-dialog-ok-btn').click(function () {
    resetProgress();
    ipc.send('killCore');
    $(".check-dialog-close").trigger("click");
  });

  $('#import-folders').click(function () {
    var material_info = ipc.sendSync('getImagesAndVideosInfo', true);
    if (material_info)
      add_materials(material_info);
  });

  $('#import-files').click(function () {
    var material_info = ipc.sendSync('getImagesAndVideosInfo', false);
    if (material_info)
      add_materials(material_info);
  });  

  // trigger display_output_info
  $("#row-input").change(function () {
    display_output_info();
  });
  $("#col-input").change(function () {
    display_output_info();
  });
  $("#scale-input").change(function () {
    display_output_info();
  });

});

// main function
function validate_config(){

  var err_msg = null;
  if ($('#src-img-input')[0].value ==''){
    err_msg = 'miss src img path';
  }
  if ($('#output-dir-input')[0].value == '') {
    err_msg = 'miss output folder path';
  }
  if ($('#row-input')[0].value == '') {
    err_msg = 'miss row value';
  }
  if ($('#col-input')[0].value == '') {
    err_msg = 'miss col value';
  }
  if ($('#scale-input')[0].value == '') {
    err_msg = 'miss scale value';
  }

  if (!row_col_scale_valid) {
    err_msg = 'row, col or scale is invalid';
  }

  if ($('.material-tr').length == 0){
    err_msg = 'no material data found';
  }

  if (err_msg) {
    $('#alert-dialog-content')[0].innerText = err_msg;
    $('#alert-dialog-hidden-btn').click();
  }else{

    $('#start-cancel-button')[0].innerText = 'Cancel';

    var args = {}
    args["input-image"] = $('#src-img-input')[0].value;
    args["output-path"] = $('#output-dir-input')[0].value;
    args["row"] = parseInt($('#row-input')[0].value, 10);
    args["col"] = parseInt($('#col-input')[0].value, 10);
    args["scale"] = parseFloat($('#scale-input')[0].value, 10);
    args["material"] = [];
    $('.material-tr').each(function () {
      var path_td = $(this).children('.path-td')[0];
      var type_td = $(this).children('.type-td')[0];
      args["material"].push({ "path": path_td.innerText, "type": type_td.innerText});
    });   

    args["no-thumbs"] =         $('#no-thumbs').is(':checked');
    args["video-sampling-ms"] = parseInt($('#vs-input')[0].value, 10);
    args["output-name"] =       $('#output-name-input')[0].value;
    args["gap"] =               parseInt($('#gap-input')[0].value, 10);
    args["enhance-colors"] =    parseInt($('#ec-input')[0].value, 10);
    args["tolerance"] =         parseFloat($('#tolerance-input')[0].value);
    args["seed"] =              parseInt($('#seed-input')[0].value, 10);

    ipc.send('exeCore', args);

  }

}

function display_output_info(){

  let output_size = null;
  if (src_img_size && $("#scale-input")[0].value){
    output_size = {};
    output_size['width'] = src_img_size.width * parseInt($("#scale-input")[0].value, 10);
    output_size['height'] = src_img_size.height * parseInt($("#scale-input")[0].value, 10);
    $("#output-size")[0].innerText = output_size['width'] + 'x' + output_size['height'];
  }

  let thumbnails_size = null;
  if (output_size && $("#row-input")[0].value && $("#col-input")[0].value){
    if (output_size.width % parseInt($("#col-input")[0].value, 10) === 0 && output_size.height % parseInt($("#row-input")[0].value, 10) === 0){
      thumbnails_size = {};
      thumbnails_size['width'] = output_size.width / parseInt($("#col-input")[0].value, 10);
      thumbnails_size['height'] = output_size.height / parseInt($("#row-input")[0].value, 10);
    }
    if (thumbnails_size){
      $("#thumbnails-size")[0].innerText = thumbnails_size['width'] + 'x' + thumbnails_size['height'];
      $("#thumbnails-size")[0].style = 'color: grey;';
      row_col_scale_valid = true;
    }else{
      $("#thumbnails-size")[0].innerText = 'Invalid'
      $("#thumbnails-size")[0].style = 'color: red;';
      row_col_scale_valid = false;
    }
  }
}

function add_materials(material_info){

  material_info.forEach(function (item) {
    var m_tr = '<tr class="material-tr">'+
      '<td class="path-td">' + item.path + '</td>'+
      '<td class="type-td">' + item.type +'</td>'+
      '<td>' + byte2string(item.size) +'</td>'+
      '<td><span class="remove"><button type="button" class="close remove-material" images_cnt="' + item.images_cnt + '" videos_cnt="' + item.videos_cnt + '"><span>&times;</span></button></span></td>'+
    '</tr>';
    $("#material-tbody").append(m_tr);

    image_cnt += item.images_cnt;
    video_cnt += item.videos_cnt;
    $("#image-count")[0].innerText = image_cnt;
    $("#video-count")[0].innerText = video_cnt;
  });

  $('.close.remove-material').unbind("click");
  $('.close.remove-material').click(function () {
    image_cnt -= $(this).attr('images_cnt');
    video_cnt -= $(this).attr('videos_cnt');
    $(this).parent().parent().parent().remove();
    $("#image-count")[0].innerText = image_cnt;
    $("#video-count")[0].innerText = video_cnt;
  });
}

function update_status_from_core(msg) {

  // ret: 0-> task completed, 1->running, -1->exception
  if (msg['ret'] === 0) {
    $('#progress-status')[0].innerText = msg['display_status']
    $('#start-cancel-button')[0].innerText = 'Start';
    $('#update-progress')[0].style.width = '100%';
    $('#update-progress')[0].innerHTML = '100%';

    if ($('#open-output').is(':checked')) {
      console.log(msg['output_path'])
      ipc.send('navExec', msg['output_path']);
    }

  } else if (msg['ret'] === 1){
    $('#update-progress')[0].style.width = msg['progress'] + '%';
    $('#update-progress')[0].innerHTML = msg['progress'] + '%';
    if ($('#progress-status')[0].innerText.replace(/ \./g, '') != msg['display_status'].replace(/ \./g, '')) { // update display status
      clearInterval(progress_status_interval);
      $('#progress-status')[0].innerText = msg['display_status'].replace(/ \./g, '');
      if (msg['display_status'].indexOf(' .') != -1) {  // status . . .
        $('#progress-status')[0].innerText += " .";
        progress_status_interval = setInterval(function () {
          var ui_status = $('#progress-status')[0].innerText;
          var dot_pos = ui_status.indexOf(' .');
          if (dot_pos <= ui_status.length - 8) {
            $('#progress-status')[0].innerText = ui_status.replace(/ \./g, '');
            $('#progress-status')[0].innerText += ' .';
          } else {
            $('#progress-status')[0].innerText += ' .';
          }
        }, 1000);
      }
    }
  } else if (msg['ret'] === -1) {

    resetProgress();
    $('#alert-dialog-content')[0].innerText = msg['err_msg'];
    $('#alert-dialog-hidden-btn').click();
    ipc.send('killCore');
  }

}

function resetProgress(){
  $('#start-cancel-button')[0].innerText = 'Start';
  $('#update-progress')[0].style.width = '0%';
  $('#update-progress')[0].innerHTML = '0%';

  clearInterval(progress_status_interval);
  $('#progress-status')[0].innerText = 'Ready';
}

function byte2string(n){
  if (n==0)
    return '';
  else if (n < 1e3)
    return n + ' B';
  else if (n < 1e6)
    return (n / 1e3).toFixed(1) + ' KB';
  else if (n < 1e9)
    return (n / 1000000).toFixed(1) + ' MB';
  else
    return (n / 1e9).toFixed(1) + ' GB';
}

function auto_calc_config(){

  var min_output_w = 5000;
  var min_output_h = 5000;
  var min_thumbnails_w = 25;
  var min_thumbnails_h = 25;

  if (src_img_size) {
    var scale = Math.ceil(Math.min(min_output_w / src_img_size.width, min_output_h / src_img_size.height));
    $("#scale-input")[0].value = scale;
    var output_w = src_img_size.width * scale;
    var output_h = src_img_size.height * scale;

    $("#col-input")[0].value = output_w;
    $("#row-input")[0].value = output_h;

    var output_w_factores = get_all_factors(output_w);
    for (let index = output_w_factores.length - 1; index >= 0; index--) {
      $("#col-input")[0].value = output_w_factores[index];
      var thumbnails_w = output_w / output_w_factores[index];
      if (thumbnails_w > min_thumbnails_w){
        break;
      }
    }

    var output_h_factores = get_all_factors(output_h);
    for (let index = output_h_factores.length - 1; index >= 0; index--) {
      $("#row-input")[0].value = output_h_factores[index];
      var thumbnails_h = output_h / output_h_factores[index];
      if (thumbnails_h > min_thumbnails_h) {
        break;
      }
    }
  }

  display_output_info();
}

function get_all_factors(n){
  
  var factors = [];
  var i = 1;
  for (i = 1; i <= n; i++)
  {
    if (n % i === 0) {
      factors.push(i);
    }
  } 
  return factors;
}