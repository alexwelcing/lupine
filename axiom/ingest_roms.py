import os
import struct

def analyze_roms():
    base_path = r"c:\Users\alexw\Downloads\shed\axiom\mmref"
    roms = [
        "Mega Man Legends (Europe).chd",
        "Mega Man 64 (USA).z64"
    ]
    
    print("=== Ouroboros Ingestion: ROM Analysis ===")
    
    for rom_name in roms:
        path = os.path.join(base_path, rom_name)
        if not os.path.exists(path):
            print(f"ERROR: {rom_name} not found.")
            continue
            
        size = os.path.getsize(path)
        print(f"\nScanning: {rom_name}")
        print(f"Size: {size / (1024*1024):.2f} MB")
        
        if rom_name.endswith(".z64"):
            # Read N64 Header
            with open(path, "rb") as f:
                header = f.read(64)
                # PI BS Domain 1 register config (0x00)
                # ClockRate (0x04)
                # PC (0x08)
                # Release (0x1C)
                # CRC1 (0x10)
                # CRC2 (0x14)
                # Name (0x20)
                
                name_bytes = header[0x20:0x34]
                try:
                    name = name_bytes.decode("ascii").strip()
                except:
                    name = "Unknown/Binary"
                    
                print(f"Header Name: {name}")
                print(f"Magic: {header[0:4].hex().upper()}")
        
        elif rom_name.endswith(".chd"):
             print("Format: CHD (Compressed Hunks of Data) - PSX Image")

     
if __name__ == "__main__":
    analyze_roms()
