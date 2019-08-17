import os
import sys
import time
import math
import json
import argparse
import hashlib
from timeit import default_timer as timer
from datetime import timedelta
import random
import ctypes

from PIL import Image
import numpy as np
import cv2


class PhotoMosaicCore(object):

    # hidden configure
    # rgb_weight = {'r': 0.65, 'g': 0.794, 'b': 0.557}
    rgb_weight = {'r': 1, 'g': 1, 'b': 1}

    # configure
    thumbs_dir = os.path.join(".", "thumbnails")
    material_dir = os.path.join(".", "material")
    thumbs_info_path = os.path.join(".", "thumbs_info.json")
    output_path = os.path.join(".", "output")

    src_img_path = ''
    row = 0
    col = 0
    scale = 1.0
    video_sampling_ms = 5000
    gen_thumbs = True
    tgt_img_filename = ''
    min_space_same_thumb = 4  # prevents  use for 2 thumbs around a same area
    enhance_colors = 27  # % or false(0)
    tolerance = 0
    thumbs_filter = None

    input = {}
    output = {}
    cell = {}
    thumbs_info = {}
    matrix = None

    def __init__(
            self,
            src_img_path,
            material_dir,
            row,
            col,
            scale=1.0,
            video_sampling_ms=5000,
            gen_thumbs=True,
            tgt_img_filename='',
            min_space_same_thumb=4,
            enhance_colors=27,
            tolerance=0,
            seed=0,
            thumbs_filter=''):

        self.src_img_path = src_img_path
        if material_dir != '':
            self.material_dir = material_dir
        self.row = row
        self.col = col
        self.scale = scale
        self.video_sampling_ms = video_sampling_ms
        self.gen_thumbs = gen_thumbs
        self.tgt_img_filename = tgt_img_filename
        self.min_space_same_thumb = min_space_same_thumb
        self.enhance_colors = enhance_colors
        self.tolerance = tolerance
        random.seed(seed)
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

        img = Image.open(self.src_img_path)
        self.input['img'] = img.resize(
            ((int)(img.size[0] * self.scale), (int)(img.size[1] * self.scale)))
        self.input['width'] = self.input['img'].size[0]
        self.input['height'] = self.input['img'].size[1]

        print('output image size {0} * {1} = {2}'.format(img.size,
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

        if not os.path.exists(self.output_path):
            os.makedirs(self.output_path)

        if self.gen_thumbs:
            self.__gen_thumbs()
        else:
            # load thumbs_info.json
            with open(self.thumbs_info_path, 'r') as f:
                self.thumbs_info = json.load(f)

    def __generate(self):

        print('Generating photo mosaic image...')

        display_progress = 0
        sys.stdout.write("\rprogress: {:.0f}%".format(display_progress))
        total = self.row * self.col

        tgt_img = Image.new('RGB', (self.input['width'], self.input['height']))
        for i in range(self.row):
            for j in range(self.col):
                # left, up, right, bottom
                region = (j*self.cell['width'],
                          i*self.cell['height'],
                          (j+1)*self.cell['width'],
                          (i+1)*self.cell['height'])

                crop_img = self.input['img'].crop(region)
                r, g, b = self.__avg_color(crop_img)
                file_name = self.__get_filename_for_closest_color((r, g, b), i, j)
                cell_path = os.path.join(self.thumbs_dir, file_name)
                cell_img = Image.open(cell_path).convert('RGB')

                if self.enhance_colors != 0:
                    alpha = (int)(self.enhance_colors / 100.0 * 255)
                    tweak_img = Image.new('RGBA', (self.cell['width'], self.cell['height']), (r, g, b, alpha))
                    cell_img.paste(tweak_img, (0, 0, self.cell['width'], self.cell['height']), tweak_img)

                tgt_img.paste(cell_img, region)

            now_progress = math.ceil(i * self.col / total * 100)
            if now_progress != display_progress:
                display_progress = now_progress
                sys.stdout.write("\rprogress: {:.0f}%".format(display_progress))

        sys.stdout.write("\rprogress: 100%")
        print()
        if self.tgt_img_filename:
            tgt_img.save(os.path.join(self.output_path, self.tgt_img_filename+'.jpg'), format='JPEG', subsampling=0, quality=100)
        else:
            tgt_img.save(os.path.join(self.output_path, 'output_{0}.jpg'.format(time.perf_counter())), format='JPEG', subsampling=0, quality=100)

    # (re)generates thumbnails and determines average color for each image
    def __gen_thumbs(self):

        print('Generating thumbnails...')

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

        display_progress = 0
        sys.stdout.write("\rprogress: {:.0f}%".format(display_progress))
        total = len(material_list)

        for idx, file in enumerate(material_list):
            sub_ext = file[-4:]
            if (sub_ext.endswith('.jpg') or
                    sub_ext.endswith('jpeg') or
                    sub_ext.endswith('.png') or
                    sub_ext.endswith('.gif') or
                    sub_ext.endswith('.bmp')):
                self.__img2thumbnail(Image.open(file))
            elif (sub_ext.endswith('.mkv') or
                    sub_ext.endswith('.avi') or
                    sub_ext.endswith('.mp4')):
                self.__gen_thumbs_from_videos(file, display_progress)

            now_progress = math.ceil(idx * 100 / total)
            if now_progress != display_progress:
                display_progress = now_progress
                sys.stdout.write("\rprogress: {:.0f}%       ".format(display_progress))

        sys.stdout.write("\rprogress: 100%      ")
        print()
        # save thumbs_info.json
        with open(self.thumbs_info_path, 'w') as f:
            json.dump(self.thumbs_info, f)

        print('Generate thumbnails completed.')

    def __gen_thumbs_from_videos(self, file, progress):

        video = cv2.VideoCapture(file)
        total = video.get(cv2.CAP_PROP_FRAME_COUNT)
        fps = video.get(cv2.CAP_PROP_FPS)

        display_sub_progress = 0

        step = (int)(fps * self.video_sampling_ms / 1000)
        for i in range(step, int(total), int(step)):
            try:
                offset = random.randrange(step)
                video.set(cv2.CAP_PROP_POS_FRAMES, i - offset)
                video.grab()
            except Exception as e:
                print(e)

            ret, frame = video.read()
            if not ret:
                continue

            f_mean = np.mean(frame, axis=(0, 1))
            if (f_mean > [10, 10, 10]).all() and (f_mean < [245, 245, 245]).all():  # filter pure black or white image
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), 'RGB')
                self.__img2thumbnail(img)

            now_progress = math.ceil(i * 100 / total)
            if now_progress != display_sub_progress:
                display_sub_progress = now_progress
                sys.stdout.write("\rprogress: {:.0f}% [{:.0f}%]     ".format(progress, display_sub_progress))

        sys.stdout.write("\rprogress: {:.0f}% [{:.0f}%]     ".format(progress, 100))
        video.release()


    def __img2thumbnail(self, img):
        region = self.__get_crop_region(img.size[0], img.size[1], self.cell['width'], self.cell['height'])
        img = img.crop(region)

        if self.thumbs_filter.lower() == 'antialias':
            img.thumbnail((self.cell['width'], self.cell['height']), Image.ANTIALIAS)
        else:
            img.thumbnail((self.cell['width'], self.cell['height']))

        img = img.crop((0, 0, self.cell['width'], self.cell['height']))

        file_name = hashlib.md5(str(time.perf_counter()).encode('utf-8')).hexdigest() + '.jpg'

        img_rgb = img.convert('RGB')
        img_rgb.save(os.path.join(self.thumbs_dir, file_name))

        r, g, b = self.__avg_color(img_rgb)
        self.thumbs_info[file_name] = {'r': r, 'g': g, 'b': b}

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
    def __avg_color(img):
        rgb = np.mean(np.array(img), axis=(0, 1))
        return (int)(rgb[0]), (int)(rgb[1]), (int)(rgb[2])

    def __get_filename_for_closest_color(self, rgb, coordy, coordx):

        diff_thumbs_info = {}
        for k, v in self.thumbs_info.items():
            diff_val = math.sqrt(
                math.pow((rgb[0] - v['r']) * self.rgb_weight['r'], 2) +
                math.pow((rgb[1] - v['g']) * self.rgb_weight['g'], 2) +
                math.pow((rgb[2] - v['b']) * self.rgb_weight['b'], 2)
            )
            diff_thumbs_info[k] = diff_val

        sorted_info = sorted(diff_thumbs_info.items(), key=lambda kv: kv[1])

        index = 0
        if self.tolerance != 0:
            for info in sorted_info:
                if info[1] <= self.tolerance:
                    index += 1

            if index != 0:
                index = random.randrange(index)

        suitable = False
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
        "sample2-2.jpg",
        #96,
        #128,
        100,
        100,
        scale=10,
        min_space_same_thumb=4,
        enhance_colors=27,
        gen_thumbs=True)
    core.generate_mosaic()
    """

    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "-input-image", dest="img", required=True, help="input image path")
    parser.add_argument("-r", "-row", dest="row", required=True, help="number of thumbnails to create per row")
    parser.add_argument("-c", "-col", dest="col", required=True, help="number of thumbnails to create per col")
    parser.add_argument("-m", "-material", dest="material_dir", default="", help="material folder path")
    parser.add_argument("-s", "-scale", dest="scale", default=1.0, help="output image size = input image size * scale")
    parser.add_argument("-vs", "-video-sampling-ms", dest="video_sampling_ms", default=5000, help="sampling video image interval (ms)")
    parser.add_argument("--no-thumbs", dest="gen_thumbs", action='store_false', help="won't (re)generate thumbnails before creating mosaic")
    parser.add_argument("-o", "-output-name", dest="tgt_img_filename", default="", help="output file name")
    parser.add_argument("-g", "-gap", dest="min_space_same_thumb", default=4, help="the min distance with same thumbnails image")
    parser.add_argument("-e", "-enhance-colors", dest="enhance_colors", default=27, help="enhance colors with original image (0~100%)")
    parser.add_argument("-t", "-tolerance", dest="tolerance", default=0, help="set tolerance and seed args can generate different photo mosaic even the material images are the same")
    parser.add_argument("-seed", dest="seed", default=0, help="random seed, using it on video image sampling and choose thumbs image")
    parser.add_argument("-f", "-thumbs_filter", dest="thumbs_filter", default="", help="use filter for creating thumbnails")
    args = parser.parse_args()

    core = PhotoMosaicCore(
        args.img,
        args.material_dir,
        (int)(args.row),
        (int)(args.col),
        (float)(args.scale),
        (int)(args.video_sampling_ms),
        args.gen_thumbs,
        args.tgt_img_filename,
        (int)(args.min_space_same_thumb),
        (int)(args.enhance_colors),
        (float)(args.tolerance),
        (int)(args.seed),
        args.thumbs_filter)

    core.generate_mosaic()
