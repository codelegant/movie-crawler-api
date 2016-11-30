### 淘宝，猫眼，格瓦拉影票信息抓取接口
- node v7.0.0 及以上，并使用 `--harmony-async-await` 模式
- 使用配置文件启动 mongoDB，根目录执行 `mongod -f .\db\db.conf` || `mongod --config .\db\db.conf`
- 超级管理员
    1. 切换数据库 `use admin`
    2. 创建角色 `db.createUser({user:"root",pwd:"root",roles:["root"]})`
- 所有数据库的读写账号
    1. 切换数据库 `use admin`
    2. 创建角色 `db.createUser({user:"admin",pwd:"admin",roles:["readWriteAnyDatabase"]})`
- 当前数据库的读写账号 
    1. 切换数据库 `use movie`
    2. 创建角色 `db.createUser({user:"api",pwd:"api",roles:["readWrite"]})`
    
    
#### 想法
- 淘宝使用电影详情页面的链接获取影院票价等信息，需要城市相关信息的 cookie `tb_city`, `tb_cityName`
- 格瓦拉使用电影详情页面的链接获取影院票价等信息，需要城市相关信息的 cookie `cityCode`
- 区域，影院，日期，时间排期，票价信息，如何存储？
    - 区域信息内嵌到 `cites`，
    - 影院信息需要新集合 `cinemas`，包含 `cityId`,`ids`,`name`,`address`
    - 影院排片信息用 `schedules`，包含影院 `ObjectId`，电影 `Id`，数组类型的 日期，场次，票价等的对象
        - 用票价区分不同网站，某个网站有票价，说明这个时间段有排片

#### TODO
- 使用 cheerio 的 .toArray() 方法将类数组转移为数组