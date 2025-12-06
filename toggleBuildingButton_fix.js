// Fixed toggleBuildingButton function for cctv_report.php
// Replace lines 302-319

        function toggleBuildingButton(building) {
            const b2Button = document.getElementById('select-b2');
            const b3Button = document.getElementById('select-b3');
            const b4Button = document.getElementById('select-b4');
            const b9Button = document.getElementById('select-b9');

            // Reset all buttons to inactive gray state
            [b2Button, b3Button, b4Button, b9Button].forEach(btn => {
                btn.classList.remove(
                    'border-green-500', 'bg-green-100', 'text-green-700',
                    'border-purple-500', 'bg-purple-100', 'text-purple-700',
                    'border-sky-500', 'bg-sky-100', 'text-sky-700',
                    'border-orange-500', 'bg-orange-100', 'text-orange-700'
                );
                btn.classList.add('border-gray-200', 'text-gray-600');
            });

            // Activate selected button with its unique color
            if (building === 'B2') {
                b2Button.classList.remove('border-gray-200', 'text-gray-600');
                b2Button.classList.add('border-green-500', 'bg-green-100', 'text-green-700');
            } else if (building === 'B3') {
                b3Button.classList.remove('border-gray-200', 'text-gray-600');
                b3Button.classList.add('border-purple-500', 'bg-purple-100', 'text-purple-700');
            } else if (building === 'B4') {
                b4Button.classList.remove('border-gray-200', 'text-gray-600');
                b4Button.classList.add('border-sky-500', 'bg-sky-100', 'text-sky-700');
            } else if (building === 'B9') {
                b9Button.classList.remove('border-gray-200', 'text-gray-600');
                b9Button.classList.add('border-orange-500', 'bg-orange-100', 'text-orange-700');
            }
        }
