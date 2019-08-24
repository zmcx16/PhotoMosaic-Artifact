/* eslint-disable no-console */

const electron = require('electron');
const ipc = electron.ipcRenderer;
const zerorpc = require("zerorpc");
var client = new zerorpc.Client();

var src_img_size = null;
var video_cnt = 0;
var image_cnt = 0;

// ipc register
ipc.on('getPort_callback', (event, port) => {

  client.connect("tcp://127.0.0.1:" + port);
  
  /*
  sendCmdToCore('genPhotoImage', 'arg1', (error, res) => {
    if (error) {
      console.error(error);
      console.error(res);
    } else {
      //update console
    }
  });
  */

  // task running

});


ipc.on('getCoreStatus', () => {
  //update UI
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

  //call main run core

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
function display_output_info(){

  let output_size = null;
  if (src_img_size && $("#scale-input")[0].value){
    output_size = {};
    output_size['width'] = src_img_size.width * parseInt($("#scale-input")[0].value);
    output_size['height'] = src_img_size.height * parseInt($("#scale-input")[0].value);
    $("#output-size")[0].innerText = output_size['width'] + 'x' + output_size['height'];
  }

  let thumbnails_size = null;
  if (output_size && $("#row-input")[0].value && $("#col-input")[0].value){
    if (output_size.width % parseInt($("#col-input")[0].value) == 0 && output_size.height % parseInt($("#row-input")[0].value) == 0){
      thumbnails_size = {};
      thumbnails_size['width'] = output_size.width / parseInt($("#col-input")[0].value);
      thumbnails_size['height'] = output_size.height / parseInt($("#row-input")[0].value);
    }
    if (thumbnails_size){
      $("#thumbnails-size")[0].innerText = thumbnails_size['width'] + 'x' + thumbnails_size['height'];
      $("#thumbnails-size")[0].style = 'color: grey;';
    }else{
      $("#thumbnails-size")[0].innerText = 'Invalid'
      $("#thumbnails-size")[0].style = 'color: red;';
    }
  }
}

function add_materials(material_info){

  material_info.forEach(function (item) {
    var m_tr = '<tr>'+
      '<td>' + item.path + '</td>'+
      '<td>' + item.type +'</td>'+
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

function byte2string(n){
  if (n==0)
    return '';
  else if (n < 1000)
    return n + ' B';
  else if (n < 1000000)
    return (n / 1000).toFixed(1) + ' KB';
  else if (n < 1000000000)
    return (n / 1000000).toFixed(1) + ' MB';
  else
    return (n / 1000000000).toFixed(1) + ' GB';
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
    if (n % i == 0) {
      factors.push(i);
    }
  } 
  return factors;
}