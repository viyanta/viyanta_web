from services.master_template import list_forms
import asyncio
import sys
sys.path.append('.')


async def test_forms():
    # Test with SBI Life PDF
    print('Testing SBI Life PDF...')
    try:
        forms = await list_forms('sbi', 'SBI Life  S FY2023 Q1.pdf')
        print(f'Found {len(forms)} forms:')
        for form in forms:
            print(
                f'  {form["sr_no"]}: {form["form_no"]} - {form["description"]} (Pages: {form["pages"]})')
    except Exception as e:
        print(f'Error testing SBI Life: {e}')

    print('\n' + '='*50 + '\n')

    # Test with HDFC Life PDF
    print('Testing HDFC Life PDF...')
    try:
        forms = await list_forms('hdfc', 'HDFC Life  S FY2023 9M.pdf')
        print(f'Found {len(forms)} forms:')
        for form in forms:
            print(
                f'  {form["sr_no"]}: {form["form_no"]} - {form["description"]} (Pages: {form["pages"]})')
    except Exception as e:
        print(f'Error testing HDFC Life: {e}')

if __name__ == "__main__":
    asyncio.run(test_forms())
