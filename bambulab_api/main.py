import time
import bambulabs_api as bl

IP = '192.168.31.73'#'192.168.31.99'
SERIAL ='01P00C510900887' #'01P00C510900903'
ACCESS_CODE = '26897419'#'29571127'

if __name__ == '__main__':
    
    print('Starting bambulabs_api example')
    print('Connecting to BambuLab 3D printer')
    print(f'IP: {IP}')
    print(f'Serial: {SERIAL}')
    print(f'Access Code: {ACCESS_CODE}')

    # Create a new instance of the API
    printer = bl.Printer(IP, ACCESS_CODE, SERIAL)

    # Connect to the BambuLab 3D printer
    printer.connect()

    time.sleep(2)

    # Get the printer status

    # decoy status, as it will return UNKNOWN for the first time
    status = printer.get_current_state()
    print(f'Printer status: {status}')
    
   

    time.sleep(0.5)

    # true status
    status = printer.get_current_state() # or get_state
    print(f'Printer status: {status}')
    

    # Disconnect from the Bambulabs 3D printer
    printer.disconnect()