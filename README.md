# PhotoMosaic-Artifact
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/36e620704dc7489c84be7dfe0b8b1f10)](https://www.codacy.com/app/zmcx16/PhotoMosaic-Artifact?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=zmcx16/PhotoMosaic-Artifact&amp;utm_campaign=Badge_Grade)

# Concept
The photo mosaic algorithm is based on [eflorit / mosaic-generator (php)](https://https://github.com/eflorit/mosaic-generator) and implements it on python language. 

Besides, I also make some interesting features on this tool, I hope the PhotoMosaic-Artifact can help you to make some amazing & exciting photos :) 

# Features
1. Make the custom photographic mosaic image
2. Support video material
3. Support GUI tool


# Support Platform 
  * Windows - Windows 10
  * Mac OS  - Mac OS 10.11+
  * Linux   - Ubuntu 16.04+
  
  P.S. 
  
  The Pyinstaller builds is not fully static([issue](https://stackoverflow.com/questions/17654363/pyinstaller-glibc-2-15-not-found)), if your OS is not compatible with PhotoMosaic-Artifact, please just run it on source code instead of executble package.

  
# Requirements
  *  Pillow>=6.1.0
  *  numpy>=1.17.0
  *  opencv-python>=4.1.0.25

# Usage for command (photomosaic-core)
1. Copy your material image files into material folder
2. Follow below command line:
```
python photomosaic-core.py -i {input path} -r {int} -c {int} -m {material folder path} -s {float} -vs {int} -o {output file name} -g {int} -e {int} -t {float} -seed {int} [--no-thumbs]
or
photomosaic-core.exe -i sample.jpg -r 145 -c 100 -s 10

-i                                      path to the original picture that shall be recreated
-r                                      number of rows in output image
-c                                      number of columns in output image
-m          (default = ".\material")    path to the material folder
-s          (default = 1)               output image size = input image size * scale
-vs         (default = 5000)            sampling video image interval (ms), only need be set if the material include video files
-o          (optional)                  output file name
-g          (default = 4)               the min distance with same thumbnails image
-e          (default = 27)              enhance colors with original image (0~100%)
-f          (default = "")              use filter for creating thumbnails
-t          (default = 0)               set tolerance and seed args can generate different photo mosaic even the material images are the same
-seed       (default = 0)               random seed, using it on video image sampling and choose thumbs image
--no-thumbs (default = false)           won't (re)generate thumbnails before creating mosaic
```

# Note
1. The output image size (input image size * scale) must be divisible by row and col, the width must divisible by column; the height must divisible by row.
2. The thumbnail image size = (input-image's width * scale / col, input-image's height * scale / row), if the aspect ratio of images in the material folder is different from the thumbnail, the image will be cropped to fit the aspect ratio of the thumbnail.

# GUI tool

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/demo.png)



# Demo sample1 ([Org output img](https://drive.google.com/uc?export=download&id=118zrAbsja_ycrM3nzqEWOH67S7eNYRbI))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample1.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output1-demo.jpg)



# Demo sample2 ([Org output img](https://drive.google.com/uc?export=download&id=1FqTAZ-qlMXydu8WFLeYexVNTKZj-xsUu))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample2.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output2-demo.jpg)



# Demo sample3 ([Org output img](https://drive.google.com/uc?export=download&id=1wWA_jp5CnLEc_3D5NuNtv-hfNah8aiZW))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample3.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output3-demo.jpg)



# Demo sample4 ([Org output img](https://drive.google.com/uc?export=download&id=1wHNtR0XJ3mz6I0BIwm-u_HdNnZNIR6yG))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample4.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output4-demo.jpg)



# Demo sample5 ([Org output img](https://drive.google.com/uc?export=download&id=1Xj4xoLshYQGh3gC5_owcCIMm2-00EYrQ))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample5.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output5-demo.jpg)



# Demo sample6 ([Org output img](https://drive.google.com/uc?export=download&id=1r9m3zX31JVCOsKTttcxg8EBeoMgU5DLB))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample6.png)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output6-demo.jpg)



# Demo sample7 ([Org output img](https://drive.google.com/uc?export=download&id=1qk9WEJH3FlrVTLmPUDokADW1Rq4sOwtf))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample7.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output7-demo.jpg)


# Reference
1. eflorit / mosaic-generator - (https://github.com/eflorit/mosaic-generator)

# License
This project is licensed under the terms of the MIT license.
