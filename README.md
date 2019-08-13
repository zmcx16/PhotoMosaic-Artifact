# PhotoMosaic-Artifact
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/36e620704dc7489c84be7dfe0b8b1f10)](https://www.codacy.com/app/zmcx16/PhotoMosaic-Artifact?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=zmcx16/PhotoMosaic-Artifact&amp;utm_campaign=Badge_Grade)

# Concept
The photo mosaic algorithm is based on [eflorit / mosaic-generator (php)](https://https://github.com/eflorit/mosaic-generator) and implements it on python language. 

Besides, I also make some interesting features on this tool, I hope the PhotoMosaic-Artifact can help you to make some amazing & exciting photos :) 

# Features
1. Make the custom photographic mosaic image
2. Support video material (TODO)
3. Support GUI tool (TODO)


# Support Platform 
  * Windows - Windows 10
  * Mac OS  - Mac OS 10.11+
  * Linux   - Ubuntu 16.04+
  
  P.S. 
  
  The Pyinstaller builds is not fully static([issue](https://stackoverflow.com/questions/17654363/pyinstaller-glibc-2-15-not-found)), if your OS is not compatible with PhotoMosaic-Artifact, please just run it on source code instead of executble package.

  
# Requirements
  *  Pillow>=6.1.0


# Usage
From command line:
```
python photomosaic-core.py -img sample.jpg -row 145 -col 100 -scale 10 -out output_sample -gap 4 -e 0 [--no-thumbs]

-img                            path to the original picture that shall be recreated
-row                            number of thumbnails to create per row
-col               				number of thumbnails to create per column
-scale      (default = 1)       output image size = input image size * scale
--no-thumbs (default = false)   won't (re)generate thumbnails before creating mosaic
-out        (optional)          output file name
-gap        (default = 4)       the min distance with same thumbnails image
-e          (default = 27)      enhance colors with original image (0~100%)
-f          (default = "")      use filter for creating thumbnails
```

  
# Demo sample1 ([Org output img](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output1.jpg))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample1.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output1-demo.jpg)



# Demo sample2 ([Org output img](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output2.jpg))


![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/sample2.jpg)

![image](https://github.com/zmcx16/PhotoMosaic-Artifact/blob/master/examples/output2-demo.jpg)


# Reference
1. eflorit / mosaic-generator - (https://github.com/eflorit/mosaic-generator)

# License
This project is licensed under the terms of the MIT license.