# Журнал сверки содержания

Каждая запись в `site/content/*.json` получает `verified: true` только вместе со строкой в этой таблице.
Источники: учебник IYT BBS (номер страницы - печатный, то есть страница PDF минус 1), МППСС-72, материалы IALA и веб-страницы с датой обращения.
Всё про Турцию, Фетхие, чартер и Dufour 430 сверяется только по веб-источникам.
Текст учебника не копируется: в записях только пересказ и короткие обязательные фразы радиообмена.

| id | источник | что сверено | дата |
|---|---|---|---|
| vhf-channels | IYT BBS, модуль 7: секция 5, с. 100; секция 6, с. 106-107 | назначение каналов 16, 70, 06, 13; списки каналов судно-судно, судно-порт, судно-берег; 60 с на канале 16; 70 не для голоса | 2026-09-17 |
| vhf-channels-fethiye | https://ecesaray.com.tr/marina/en/services/ ; https://www.d-marin.com/en/marinas/gocek/ ; https://www.clubmarina.com.tr/ | Ece Saray - канал 73, вышка и швартовщики 24/7; D-Marin Göcek - канал 73, вызывать при подходе; Club Marina - канал 72, 24/7 | 2026-09-17 |
| vhf-mayday | IYT BBS, модуль 7, секция 8, с. 113; секция 6, с. 103; https://www.navcen.uscg.gov/dsc-distress (схема IMO MSC.1/Circ.1658) ; https://www.rya.org.uk/water-safety/communication/mayday-and-pan-pan-calls/ | когда подавать, решение шкипера, порядок строк вызова и сообщения, MMSI в голосовом вызове после DSC, мощность HI на 16 | 2026-09-17 |
| vhf-mayday-received | IYT BBS, модуль 7, секция 8, с. 113-114 | что записать, пауза около 10 с, формат подтверждения, следовать на помощь и сообщить время прибытия | 2026-09-17 |
| vhf-mayday-relay | IYT BBS, модуль 7, секция 8, с. 115 | когда ретранслировать, формат MAYDAY RELAY, ретрансляция увиденного сигнала бедствия | 2026-09-17 |
| vhf-panpan | IYT BBS, модуль 7, секция 8, с. 116; https://www.rya.org.uk/water-safety/communication/mayday-and-pan-pan-calls/ | когда подавать, формат, PAN-PAN MEDICO, DSC-вызов срочности из меню без красной кнопки | 2026-09-17 |
| vhf-securite | IYT BBS, модуль 7, секция 8, с. 116-117 | назначение, формат, сообщение на рабочем канале, дослушать до конца | 2026-09-17 |
| vhf-cancel | https://www.navcen.uscg.gov/instructions-for-canceling-false-distress-alert (по IMO A.814(19)) ; https://www.navcen.uscg.gov/dsc-distress ; IYT BBS, модуль 7, секция 8, с. 119 | формат голосовой отмены на 16; не выключать радио, отмена через меню DSC; без наказания при немедленной отмене; случайный EPIRB | 2026-09-17 |
| vhf-marina | IYT BBS, модуль 7, секция 7, с. 108, 111; https://www.d-marin.com/en/marinas/gocek/ ; https://ecesaray.com.tr/marina/en/services/ | форма вызова (вызываемый 1 раз, вызывающий 2 раза), вызов на рабочем канале, каналы марин | 2026-09-17 |
| vhf-prowords | IYT BBS, модуль 7, секция 7, с. 108-109; секция 6, с. 107; секция 8, с. 114-116 | значения процедурных слов, RECEIVED вместо ROGER, запрет OVER AND OUT, 10 с на проверку, SEELONCE/PRUDONCE, MEDICO | 2026-09-17 |
| vhf-phonetic | IYT BBS, модуль 7, секция 7, с. 109 (таблица - картинка на странице, сверена по изображению) | 26 кодовых слов, цифры по-английски, 9 - NINER | 2026-09-17 |
| vhf-dsc | https://www.navcen.uscg.gov/dsc-distress (схема IMO MSC.1/Circ.1658) ; https://www.rya.org.uk/water-safety/communication/calling-for-help/ ; IYT BBS, модуль 7, секция 6, с. 107 | крышка и кнопка больше 3 с до непрерывного сигнала; MMSI и координаты только с GPS; повтор до подтверждения; голос с трубки на 16; цифровое подтверждение береговой охраны; 70 не для голоса | 2026-09-17 |
| vhf-numbers | https://www.icisleri.gov.tr/illeridaresi/112-acil-agri-merkezleri-projesi | 112 - единый номер, в него сведены 155, 156, 158 (Sahil Güvenlik), 110, 177, 122; работает во всех 81 провинции | 2026-09-17 |
