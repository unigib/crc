# CRC Explorer

CRC Explorer includes a static, browser-based learning app and an interactive
Python/Tkinter desktop app. The browser app demonstrates CRC error detection
with a clickable 64-byte data block and a step-by-step XOR division exercise;
the desktop app visualizes CRC modulo-2 long division.

## Static web app

Open `index.html` in a browser to run the learning app locally. It is a
dependency-free static site (the optional fonts load from Google Fonts) and can
be deployed to AWS Amplify Hosting by connecting this repository. Use the
repository root as the app root; no build command or build output directory is
required.

The data-block demonstration calculates a checksum over 64 random bytes using
a selectable CRC-8, CRC-16, or CRC-32 standard, including each standard's
initial value, reflection, and final XOR settings. Select a displayed
hexadecimal byte to inspect and flip its individual bits; the checksum
recalculates as bits change. The XOR lab steps through modulo-2 long division
one bit position at a time, with back/reset controls, and shows the resulting CRC
and transmitted codeword when complete. It accepts a 16-bit message and a
selectable standard or custom generator polynomial.

## Run

### Desktop app

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
