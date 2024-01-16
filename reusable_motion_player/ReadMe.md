## Motion Visualization Tool

### Getting Started
1. **File Format:** Validate that your file is a CSV file
2. **Column Format:** Validate that your column names match those introduced by our standard:
   - `delta_time_ms`
   - `head_pos_x`
   - `head_pos_y`
   - `head_pos_z`
   - `head_rot_x`
   - `head_rot_y`
   - `head_rot_z`
   - `head_rot_w`
   - `left_hand_pos_x`
   - `left_hand_pos_y`
   - `left_hand_pos_z`
   - `left_hand_rot_x`
   - `left_hand_rot_y`
   - `left_hand_rot_z`
   - `left_hand_rot_w`
   - `right_hand_pos_x`
   - `right_hand_pos_y`
   - `right_hand_pos_z`
   - `right_hand_rot_x`
   - `right_hand_rot_y`
   - `right_hand_rot_z`
   - `right_hand_rot_w`
3. **Representation of Rotation:** Validate that you are using quaternions
4. Lastly, to reference your CSV file, you need to copy the file path into the `index.html` file

### Starting a Local Server with Python
1. Ensure you have Python installed on your system. You can download it from [python.org](https://www.python.org/).
2. Open the terminal and navigate to the directory that contains the `index.html` file
3. Run `python -m http.server 8081` to start the server
4. Open a web browser and go to `http://localhost:8081`. The index.html should now be served on this port, and you can access your web content locally.

---

### Troubleshooting
If you have both Python 2 and Python 3 installed, and `python` command refers to Python 2.x, 
you might need to use `python3` instead: 
```bash
python3 -m http.server 8081
```
