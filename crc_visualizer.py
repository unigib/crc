"""An interactive, step-by-step CRC modulo-2 division visualizer."""

from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk


BRAND_RED = "#c8102e"
INK = "#20242b"
MUTED = "#59616d"
POLYNOMIALS = {
    "CRC-8 (0x07)": "100000111",
    "CRC-16/CCITT-FALSE (0x1021)": "10001000000100001",
    "CRC-16/ARC (0x8005)": "11000000000000101",
    "CRC-32/IEEE (0x04C11DB7)": "100000100110000010001110110110111",
}
MAX_INPUT_BYTES = 64


def bytes_to_bits(data):
    """Return the bytes as one MSB-first binary string."""
    return "".join(f"{byte:08b}" for byte in data)


def divide_modulo_2(message_bits, divisor_bits):
    """Return (remainder, XOR steps) for basic MSB-first polynomial division."""
    degree = len(divisor_bits) - 1
    working = list(message_bits + ("0" * degree))
    steps = []

    for position in range(len(message_bits)):
        if working[position] != "1":
            continue
        before = "".join(working[position : position + len(divisor_bits)])
        for offset, divisor_bit in enumerate(divisor_bits):
            working[position + offset] = str(
                int(working[position + offset]) ^ int(divisor_bit)
            )
        after = "".join(working[position : position + len(divisor_bits)])
        steps.append((position, before, divisor_bits, after))

    remainder = "".join(working[-degree:]) if degree else ""
    return remainder, steps


class CRCVisualizer:
    def __init__(self, root):
        self.root = root
        root.title("CRC Explorer | University of Gibraltar")
        root.geometry("1040x780")
        root.minsize(780, 600)
        root.configure(bg="#f4f5f7")

        self.polynomial_name = tk.StringVar(value=next(iter(POLYNOMIALS)))
        self.divisor_value = tk.StringVar(value=POLYNOMIALS[self.polynomial_name.get()])
        self.message_value = tk.StringVar(value="Hello, CRC!")

        self._build_ui()
        self._load_logo()
        self.calculate()

    def _build_ui(self):
        style = ttk.Style()
        style.configure("TFrame", background="#f4f5f7")
        style.configure("TLabel", background="#f4f5f7", foreground=INK, font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI", 21, "bold"), foreground=BRAND_RED)
        style.configure("Subtitle.TLabel", font=("Segoe UI", 10), foreground=MUTED)
        style.configure("Section.TLabel", font=("Segoe UI", 11, "bold"))
        style.configure("Go.TButton", font=("Segoe UI", 10, "bold"))

        header = ttk.Frame(self.root, padding=(24, 16, 24, 12))
        header.pack(fill="x")
        self.logo_label = ttk.Label(header)
        self.logo_label.pack(side="left", padx=(0, 18))
        title_block = ttk.Frame(header)
        title_block.pack(side="left", fill="x", expand=True)
        ttk.Label(title_block, text="CRC Explorer", style="Title.TLabel").pack(anchor="w")
        ttk.Label(
            title_block,
            text="See how cyclic redundancy checks work through binary XOR division.",
            style="Subtitle.TLabel",
        ).pack(anchor="w", pady=(3, 0))

        controls = ttk.Frame(self.root, padding=(24, 12, 24, 16))
        controls.pack(fill="x")
        ttk.Label(controls, text="Message", style="Section.TLabel").grid(
            row=0, column=0, sticky="w", pady=(0, 6)
        )
        self.message_entry = ttk.Entry(controls, textvariable=self.message_value, font=("Consolas", 11))
        self.message_entry.grid(row=1, column=0, sticky="ew", padx=(0, 18))
        ttk.Label(controls, text="Common generator polynomial", style="Section.TLabel").grid(
            row=0, column=1, sticky="w", pady=(0, 6)
        )
        self.polynomial_combo = ttk.Combobox(
            controls,
            textvariable=self.polynomial_name,
            values=(*POLYNOMIALS.keys(), "Custom"),
            state="readonly",
            width=30,
        )
        self.polynomial_combo.grid(row=1, column=1, sticky="ew", padx=(0, 18))
        self.polynomial_combo.bind("<<ComboboxSelected>>", self._select_polynomial)
        ttk.Label(controls, text="Divisor bits (leading 1 included)", style="Section.TLabel").grid(
            row=0, column=2, sticky="w", pady=(0, 6)
        )
        self.divisor_entry = ttk.Entry(
            controls, textvariable=self.divisor_value, font=("Consolas", 10), width=36
        )
        self.divisor_entry.grid(row=1, column=2, sticky="ew")
        controls.columnconfigure(0, weight=2)
        controls.columnconfigure(1, weight=1)
        controls.columnconfigure(2, weight=2)

        actions = ttk.Frame(self.root, padding=(24, 0, 24, 12))
        actions.pack(fill="x")
        calculate_button = tk.Button(
            actions,
            text="Calculate CRC",
            command=self.calculate,
            bg=BRAND_RED,
            fg="white",
            activebackground="#a70d26",
            activeforeground="white",
            relief="flat",
            padx=18,
            pady=8,
            font=("Segoe UI", 10, "bold"),
            cursor="hand2",
        )
        calculate_button.pack(side="left")
        self.status_label = ttk.Label(actions, text="", style="Subtitle.TLabel")
        self.status_label.pack(side="left", padx=14)

        ttk.Label(self.root, text="XOR division walkthrough", style="Section.TLabel").pack(
            anchor="w", padx=24, pady=(0, 6)
        )
        output_frame = ttk.Frame(self.root, padding=(24, 0, 24, 16))
        output_frame.pack(fill="both", expand=True)
        self.output = tk.Text(
            output_frame,
            wrap="none",
            font=("Consolas", 10),
            bg="white",
            fg=INK,
            relief="solid",
            borderwidth=1,
            padx=14,
            pady=12,
            state="disabled",
        )
        vertical_scroll = ttk.Scrollbar(output_frame, orient="vertical", command=self.output.yview)
        horizontal_scroll = ttk.Scrollbar(output_frame, orient="horizontal", command=self.output.xview)
        self.output.configure(yscrollcommand=vertical_scroll.set, xscrollcommand=horizontal_scroll.set)
        self.output.grid(row=0, column=0, sticky="nsew")
        vertical_scroll.grid(row=0, column=1, sticky="ns")
        horizontal_scroll.grid(row=1, column=0, sticky="ew")
        output_frame.rowconfigure(0, weight=1)
        output_frame.columnconfigure(0, weight=1)

        ttk.Label(
            self.root,
            text="Teaching model: MSB-first, zero-initialized, non-reflected modulo-2 division; "
            "no final XOR. Standard CRC implementations can use additional parameters.",
            style="Subtitle.TLabel",
            wraplength=980,
        ).pack(anchor="w", padx=24, pady=(0, 14))
        self.root.bind("<Return>", lambda _event: self.calculate())

    def _load_logo(self):
        logo_path = Path(__file__).with_name("logo.png")
        if logo_path.exists():
            self.logo_image = tk.PhotoImage(file=str(logo_path))
            scale = max(1, (max(self.logo_image.width(), self.logo_image.height()) + 99) // 100)
            if scale > 1:
                self.logo_image = self.logo_image.subsample(scale, scale)
            self.logo_label.configure(image=self.logo_image)
        else:
            self.logo_label.configure(
                text="UNIVERSITY\nOF GIBRALTAR",
                foreground=BRAND_RED,
                font=("Segoe UI", 10, "bold"),
            )

    def _select_polynomial(self, _event=None):
        name = self.polynomial_name.get()
        if name in POLYNOMIALS:
            self.divisor_value.set(POLYNOMIALS[name])

    def calculate(self):
        try:
            data = self.message_value.get().encode("utf-8")
        except UnicodeEncodeError as error:
            messagebox.showerror("Invalid message", f"Could not encode the message as UTF-8:\n{error}")
            return

        divisor = self.divisor_value.get().strip()
        if len(data) > MAX_INPUT_BYTES:
            messagebox.showerror(
                "Message too long",
                f"Keep the message to {MAX_INPUT_BYTES} UTF-8 bytes or fewer so the walkthrough stays readable.",
            )
            return
        if len(divisor) < 2 or any(bit not in "01" for bit in divisor) or divisor[0] != "1":
            messagebox.showerror(
                "Invalid divisor",
                "Enter a binary polynomial of at least two bits, starting with 1 "
                "(for example, 100000111).",
            )
            return
        if divisor[-1] != "1":
            messagebox.showerror(
                "Invalid divisor",
                "The divisor must end in 1 so the polynomial has a nonzero constant term.",
            )
            return

        message_bits = bytes_to_bits(data)
        remainder, steps = divide_modulo_2(message_bits, divisor)
        padded = message_bits + ("0" * (len(divisor) - 1))
        codeword = message_bits + remainder
        verified_remainder, _ = divide_modulo_2(codeword, divisor)

        lines = [
            "1. Encode the message as UTF-8, then write each byte MSB first.",
            f"   UTF-8 bytes : {data.hex(' ').upper() or '(empty message)'}",
            f"   Message bits: {message_bits or '(empty message)'}",
            "",
            f"2. Divisor     : {divisor}  (degree {len(divisor) - 1})",
            f"   Append {len(divisor) - 1} zero bits to the message:",
            f"   {padded or '(empty bit string)'}",
            "",
            "3. Scan left to right. When the current bit is 1, XOR that window "
            "with the divisor; when it is 0, move on.",
        ]
        if not steps:
            lines.extend(["", "   No XOR steps were needed; every scanned bit was 0."])
        for number, (position, before, xor_bits, after) in enumerate(steps, start=1):
            lines.extend(
                [
                    "",
                    f"   XOR {number} (bit position {position}):",
                    f"     {before}",
                    f"   ^ {xor_bits}",
                    f"     {after}",
                ]
            )
        lines.extend(
            [
                "",
                f"4. Remainder (CRC): {remainder}",
                f"   Transmitted codeword (message + remainder): {codeword or '(empty bit string)'}",
                f"   Check: dividing the codeword by the divisor gives remainder {verified_remainder}.",
                "",
                "CRC value (hex): "
                + (f"0x{int(remainder or '0', 2):0{(len(remainder) + 3) // 4}X}" if remainder else "0x0"),
            ]
        )
        self.output.configure(state="normal")
        self.output.delete("1.0", "end")
        self.output.insert("1.0", "\n".join(lines))
        self.output.configure(state="disabled")
        self.status_label.configure(
            text=f"{len(data)} UTF-8 byte(s)  |  {len(steps)} XOR step(s)  |  "
            f"CRC {remainder or '0'}"
        )


def main():
    root = tk.Tk()
    CRCVisualizer(root)
    root.mainloop()


if __name__ == "__main__":
    main()
