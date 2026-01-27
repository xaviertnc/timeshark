<?php

class JsonStore {
    private $dataDir;

    public function __construct() {
        $this->dataDir = __DIR__ . '/../data/';
        if (!is_dir($this->dataDir)) {
            mkdir($this->dataDir, 0777, true);
        }
    }

    private function getFilePath($storeName) {
        return $this->dataDir . $storeName . '.json';
    }

    public function get($storeName) {
        $filePath = $this->getFilePath($storeName);
        if (!file_exists($filePath)) {
            return [];
        }
        
        $content = file_get_contents($filePath);
        return json_decode($content, true) ?? [];
    }

    public function save($storeName, $data) {
        $filePath = $this->getFilePath($storeName);
        
        // Atomic write with lock
        $fp = fopen($filePath, 'c+'); // Open for reading and writing; place the file pointer at the beginning.
        if (flock($fp, LOCK_EX)) { // Acquire an exclusive lock
            ftruncate($fp, 0);      // Truncate file
            fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
            fflush($fp);            // Flush output before releasing the lock
            flock($fp, LOCK_UN);    // Release the lock
        } else {
            throw new Exception("Could not lock file for writing: $storeName");
        }
        fclose($fp);
    }

    public function find($storeName, $id) {
        $data = $this->get($storeName);
        foreach ($data as $item) {
            if ($item['id'] == $id) {
                return $item;
            }
        }
        return null;
    }

    public function insert($storeName, $item) {
        $data = $this->get($storeName);
        if (empty($item['id'])) {
            $item['id'] = uniqid();
        }
        $data[] = $item;
        $this->save($storeName, $data);
        return $item;
    }

    public function update($storeName, $id, $updates) {
        $data = $this->get($storeName);
        $updatedItem = null;
        foreach ($data as &$item) {
            if ($item['id'] == $id) {
                $item = array_merge($item, $updates);
                $updatedItem = $item;
                break;
            }
        }
        if ($updatedItem) {
            $this->save($storeName, $data);
        }
        return $updatedItem;
    }

    public function delete($storeName, $id) {
        $data = $this->get($storeName);
        $newData = array_filter($data, function($item) use ($id) {
            return $item['id'] != $id;
        });
        
        if (count($data) !== count($newData)) {
            $this->save($storeName, array_values($newData));
            return true;
        }
        return false;
    }
}
