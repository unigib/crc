# CRC Explorer

An interactive Python/Tkinter app that demonstrates how a CRC remainder is
calculated using binary XOR (modulo-2) long division. The University of
Gibraltar logo is used for the app branding.

## Run

Requirements: Python 3 with Tkinter. Tkinter is included with most standard
Python installations; on some Linux distributions it is provided by a separate
`python3-tk` package.

Keep `crc_visualizer.py` and `logo.png` in the same folder, then run:

```text
python crc_visualizer.py
```

On Windows, a standalone build is available at
[`dist/CRCExplorer.exe`](dist/CRCExplorer.exe). It includes the logo and does
not require a separate Python installation. Double-click it to launch.

To rebuild the Windows executable, install PyInstaller and run:

```text
python -m pip install pyinstaller
python -m PyInstaller --noconfirm --clean --onefile --windowed --name CRCExplorer --add-data "logo.png;." crc_visualizer.py
```

Enter a message, choose a common generator polynomial, and select **Calculate
CRC**. The divisor bits are editable; choose **Custom** in the list and enter a
binary polynomial to try another. The walkthrough shows the message's UTF-8
bytes, the appended zero bits, each XOR operation, the remainder, and a
zero-remainder check of the resulting codeword. Messages are limited to 64
UTF-8 bytes to keep the explanation readable.

## Included polynomials

| Name | Polynomial | Divisor bits |
| --- | --- | --- |
| CRC-8 | `0x07` | `100000111` |
| CRC-16/CCITT-FALSE | `0x1021` | `10001000000100001` |
| CRC-16/ARC | `0x8005` | `11000000000000101` |
| CRC-32/IEEE | `0x04C11DB7` | `100000100110000010001110110110111` |

## Important note

This is a teaching implementation of polynomial division with an initial
register of zero, most-significant-bit-first processing, no reflection, and no
final XOR. Named CRC standards often define additional parameters (including
initial values, reflection, and final XOR). Therefore the result here illustrates
the XOR division principle and is not necessarily the standard CRC value that a
library returns for the same name.
