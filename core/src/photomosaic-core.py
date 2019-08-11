import argparse


class PhotoMosaicCore(object):

    def __init__(self):
        pass

    def generate_mosaic(self, src_img_path, material_path, row, col, scale=1.0, gen_thumbs=True):
        pass

    def __prepare(data):



        """
        $this->input['img']    = imagecreatefromjpeg($this->input_filename);
		//$this->input['img']    = $this->resize_imagejpeg($this->input_filename, 4000, 5800);
        $this->input['width']  = imagesx($this->input['img']);
        $this->input['height'] = imagesy($this->input['img']);

        $this->db = mysqli_connect(
            $this->db_config['host'],
            $this->db_config['username'],
            $this->db_config['pwd'],
            $this->db_config['db_name']
        );

        if(!mysqli_select_db($this->db, $this->db_config['db_name']))
            throw new Exception('Database error');

        if($this->input['width'] % $this->columns)
            throw new Exception($this->columns.' not a multiple of '.$this->input['width']);
        if($this->input['height'] % $this->rows)
            throw new Exception($this->rows.' not a multiple of '.$this->input['height']);

        $this->cell = array(
            'width'  => $this->input['width']  / $this->columns,
            'height' => $this->input['height'] / $this->rows
        );

        if(!is_dir($this->thumbs_dir)) throw new Exception('"'.$this->thumbs_dir.'" does not exist');
        if($this->gen_thumbs) $this->gen_thumbs();
        $this->load_thumbs();
        """
        pass


if __name__ == "__main__":

    parser = argparse.ArgumentParser()
    parser.add_argument("-arg0", dest="arg0")
    args = parser.parse_args()
    if args.arg0:
        core = PhotoMosaicCore()
        core.generate_mosaic():

    else:
        print('The arguments are invalid.')
