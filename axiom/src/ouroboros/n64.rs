use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

pub struct N64Rom {
    pub data: Vec<u8>,
    pub name: String,
    pub crc1: u32,
    pub crc2: u32,
}

impl N64Rom {
    pub fn load<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let mut file = File::open(path)?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)?;

        if data.len() < 0x40 {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "ROM too small"));
        }

        // Parse Header
        // 0x20 - 0x34: Name (20 chars)
        let name_bytes = &data[0x20..0x34];
        let name = String::from_utf8_lossy(name_bytes).trim().to_string();

        let crc1 = u32::from_be_bytes(data[0x10..0x14].try_into().unwrap());
        let crc2 = u32::from_be_bytes(data[0x14..0x18].try_into().unwrap());

        Ok(Self {
            data,
            name,
            crc1,
            crc2,
        })
    }
}
