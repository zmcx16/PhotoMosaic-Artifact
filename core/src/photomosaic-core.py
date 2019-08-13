import os
import sys
import time
import math
import json
import argparse
import hashlib
from timeit import default_timer as timer
from datetime import timedelta

from PIL import Image, ImageStat


class PhotoMosaicCore(object):

    thumbs_dir = os.path.join(".", "thumbnails")
    material_dir = os.path.join(".", "material")
    thumbs_info_path = os.path.join(".", "thumbs_info.json")
    min_space_same_thumb = 4  # prevents  use for 2 thumbs around a same area
    enhance_colors = 27  # % or false(0)
    thumbs_filter = None

    src_img_path = ''
    row = 0
    col = 0
    scale = 1.0
    gen_thumbs = True
    tgt_img_filename = ''

    input = {}
    output = {}
    cell = {}
    thumbs_info = {}
    matrix = None

    def __init__(
            self,
            src_img_path,
            row,
            col,
            scale=1.0,
            gen_thumbs=True,
            tgt_img_filename='',
            min_space_same_thumb=4,
            enhance_colors=27,
            thumbs_filter=''):

        self.src_img_path = src_img_path
        self.row = row
        self.col = col
        self.scale = scale
        self.gen_thumbs = gen_thumbs
        self.tgt_img_filename = tgt_img_filename
        self.min_space_same_thumb = min_space_same_thumb
        self.enhance_colors = enhance_colors
        self.thumbs_filter = thumbs_filter

        self.matrix = [[0] * self.col for _ in range(self.row)]

    def generate_mosaic(self):

        start = timer()

        self.__prepare()
        self.__generate()

        end = timer()
        print()
        print('Task Completed, Execution Time: {0}'.format(timedelta(seconds=end - start)))

    def __prepare(self):

        im = Image.open(self.src_img_path)
        self.input['img'] = im.resize(
            ((int)(im.size[0] * self.scale), (int)(im.size[1] * self.scale)))
        self.input['width'] = self.input['img'].size[0]
        self.input['height'] = self.input['img'].size[1]

        print('output image size {0} * {1} = {2}'.format(im.size,
                                                         self.scale, self.input['img'].size))

        if self.input['width'] % self.col != 0:
            raise Exception(
                '{0} not a multiple of {1}'.format(
                    self.col, self.input['width']))

        if self.input['height'] % self.row != 0:
            raise Exception(
                '{0} not a multiple of {1}'.format(
                    self.row, self.input['height']))

        self.cell['width'] = (int)(self.input['width'] / self.col)
        self.cell['height'] = (int)(self.input['height'] / self.row)

        if not os.path.exists(self.material_dir):
            os.makedirs(self.material_dir)

        if not os.path.exists(self.thumbs_dir):
            os.makedirs(self.thumbs_dir)

        if self.gen_thumbs:
            self.__gen_thumbs()
        else:
            # load thumbs_info.json
            with open(self.thumbs_info_path, 'r') as f:
                self.thumbs_info = json.load(f)

    def __generate(self):

        display_progress = 0
        sys.stdout.write("\rprogress: {:.0f}%".format(display_progress))
        total = self.row * self.col

        tgt_im = Image.new('RGB', (self.input['width'], self.input['height']))
        for i in range(self.row):
            for j in range(self.col):
                # left, up, right, bottom
                region = (j*self.cell['width'],
                          i*self.cell['height'],
                          (j+1)*self.cell['width'],
                          (i+1)*self.cell['height'])

                crop_im = self.input['img'].crop(region)
                r, g, b = self.__ave_color(crop_im)
                file_name = self.__get_filename_for_closest_color((r, g, b), i, j)
                cell_path = os.path.join(self.thumbs_dir, file_name)
                cell_im = Image.open(cell_path).convert('RGB')

                if self.enhance_colors != 0:
                    alpha = (int)(self.enhance_colors / 100.0 * 255)
                    tweak_im = Image.new('RGBA', (self.cell['width'], self.cell['height']), (r, g, b, alpha))
                    cell_im.paste(tweak_im, (0, 0, self.cell['width'], self.cell['height']), tweak_im)

                tgt_im.paste(cell_im, region)

            now_progress = math.ceil(i * self.col / total * 100)
            if now_progress != display_progress:
                display_progress = now_progress
                sys.stdout.write("\rprogress: {:.0f}%".format(display_progress))

        sys.stdout.write("\rprogress: 100%")
        print()
        if self.tgt_img_filename:
            tgt_im.save(self.tgt_img_filename+'.jpg', format='JPEG', subsampling=0, quality=100)
        else:
            tgt_im.save('output_{0}.jpg'.format(time.perf_counter()), format='JPEG', subsampling=0, quality=100)

    # (re)generates thumbnails and determines average color for each image
    def __gen_thumbs(self):

        print('Regenerating thumbnails... This may take up to a few minutes.')

        # clear thumbs files
        for the_file in os.listdir(self.thumbs_dir):
            file_path = os.path.join(self.thumbs_dir, the_file)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(e)

        material_list = []
        for root, dirs, files in os.walk(self.material_dir):
            for f in files:
                material_list.append(os.path.join(root, f))

        if len(material_list) == 0:
            raise Exception('No photos to process in ', self.material_dir)

        for file in material_list:
            sub_ext = file[-4:]
            if (sub_ext.endswith('.jpg') or
                sub_ext.endswith('jpeg') or
                sub_ext.endswith('.png') or
                sub_ext.endswith('.gif') or
                    sub_ext.endswith('.bmp')):

                im = Image.open(file)
                region = self.__get_crop_region(im.size[0], im.size[1], self.cell['width'], self.cell['height'])
                im = im.crop(region)
                im.thumbnail((self.cell['width'], self.cell['height']), Image.ANTIALIAS)

                if self.thumbs_filter and self.thumbs_filter.lower() == 'antialias':
                    im.thumbnail((self.cell['width'], self.cell['height']), Image.ANTIALIAS)
                else:
                    im.thumbnail((self.cell['width'], self.cell['height']))

                im = im.crop((0, 0, self.cell['width'], self.cell['height']))

                file_name = '{0}{1}'.format(file, time.perf_counter())
                file_name = hashlib.md5(file_name.encode('utf-8')).hexdigest() + '.jpg'
                im_rgb = im.convert('RGB')
                im_rgb.save(os.path.join(self.thumbs_dir, file_name))

                r, g, b = self.__ave_color(im_rgb)
                self.thumbs_info[file_name] = {'r': r, 'g': g, 'b': b}

        # save thumbs_info.json
        with open(self.thumbs_info_path, 'w') as f:
            json.dump(self.thumbs_info, f)

        print('Generate thumbnails completed.')

    @staticmethod
    def __get_crop_region(width, height, sample_width, sample_height):

        wh_ratio = width * 1.0 / height
        sample_wh_ratio = sample_width * 1.0 / sample_height

        # drop redundant width
        if wh_ratio > sample_wh_ratio:
            new_width = (int)(sample_wh_ratio * height)
            new_height = height

        # drop redundant height
        else:
            new_width = width
            new_height = (int)(width / sample_wh_ratio)

        left = (int)((width - new_width) / 2)
        top = (int)((height - new_height) / 2)
        right = left + new_width
        bottom = top + new_height

        return (left, top, right, bottom)

    @staticmethod
    def __ave_color(img):
        width, height = img.size

        r_total = 0
        g_total = 0
        b_total = 0

        count = 0
        for x in range(0, width):
            for y in range(0, height):
                r, g, b = img.getpixel((x, y))
                r_total += r
                g_total += g
                b_total += b
                count += 1

        return (int)(r_total/count), (int)(g_total/count), (int)(b_total/count)

    def __get_filename_for_closest_color(self, rgb, coordy, coordx):

        diff_thumbs_info = {}
        for k, v in self.thumbs_info.items():
            diff_val = math.sqrt(
                math.pow((rgb[0] - v['r']) * 0.650, 2) +
                math.pow((rgb[1] - v['g']) * 0.794, 2) +
                math.pow((rgb[2] - v['b']) * 0.557, 2)
            )
            diff_thumbs_info[k] = diff_val

        sorted_info = sorted(diff_thumbs_info.items(), key=lambda kv: kv[1])

        suitable = False
        index = 0
        while not suitable:

            suitable = True
            tgt_file_name = sorted_info[index][0]
            index += 1

            i = max(0, (coordy - self.min_space_same_thumb) + 1)
            i_max = min(self.row, coordy + self.min_space_same_thumb)
            while i < i_max:
                j = max(0, (coordx - self.min_space_same_thumb) + 1)
                j_max = min(self.col, coordx + self.min_space_same_thumb)
                while j < j_max:
                    if self.matrix[i][j] != 0 and self.matrix[i][j] == tgt_file_name:
                        suitable = False
                        break

                    j += 1
                i += 1

        self.matrix[coordy][coordx] = tgt_file_name
        return tgt_file_name


if __name__ == "__main__":
    """
    core = PhotoMosaicCore(
        "sample2.jpg",
        96,
        128,
        scale=10,
        min_space_same_thumb=4,
        gen_thumbs=True)
    core.generate_mosaic()
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("-img", "--input-image", dest="img", required=True, help="input image path")
    parser.add_argument("-row", dest="row", required=True, help="number of thumbnails to create per row")
    parser.add_argument("-col", dest="col", required=True, help="number of thumbnails to create per col")
    parser.add_argument("-scale", dest="scale", default=1.0, help="output image size = input image size * scale")
    parser.add_argument("--no-thumbs", dest="gen_thumbs", action='store_false', help="won't (re)generate thumbnails before creating mosaic")
    parser.add_argument("-out", "--output-name", dest="tgt_img_filename", default="", help="output file name")
    parser.add_argument("-gap", dest="min_space_same_thumb", default=4, help="the min distance with same thumbnails image")
    parser.add_argument("-e", "-enhance-colors", dest="enhance_colors", default=27, help="enhance colors with original image (0~100%)")
    parser.add_argument("-f", "-thumbs_filter", dest="thumbs_filter", default="", help="use filter for creating thumbnails")
    args = parser.parse_args()

    core = PhotoMosaicCore(
        args.img,
        (int)(args.row),
        (int)(args.col),
        (float)(args.scale),
        args.gen_thumbs,
        args.tgt_img_filename,
        (int)(args.min_space_same_thumb),
        (int)(args.enhance_colors),
        args.thumbs_filter)

    core.generate_mosaic()
